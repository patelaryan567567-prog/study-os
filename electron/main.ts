import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
  shell,
} from "electron";
import http from "http";
import fs from "fs";
import path from "path";
import { initAutoUpdater } from "./autoUpdater";
import { initAppBlocker } from "./appBlocker";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const APP_PORT = 51799;

// Renderer crash count; after repeated crashes we stop auto-reloading so we never
// end up in an infinite reload loop.
let consecutiveCrashes = 0;
const MAX_CRASH_RELOADS = 3;

// Desktop shell look: remove the default Electron menu bar ("File Edit View
// Window"), which makes the app look like a browser window even though it is
// not. The tray menu and all keyboard shortcuts tied to the app still work.

Menu.setApplicationMenu(null);

// Known Windows/Electron compositing bug: text inputs intermittently stop
// taking focus on click — the caret never appears, the focus ring never
// shows, and only minimize+restore (which forces a full re-composite) fixes
// it until the next glitch. Hardware acceleration stays ON because disabling it
// However, disabling hardware acceleration forces CPU rendering and made the
// animations/scroll visibly laggy on Windows, so we keep hardware acceleration
// ON. The real fix for the focus bug is renderer-side: a pointerdown focus
// guarantee in src/App.tsx plus re-asserting webContents focus on show/focus
// below. GPU stays on for smooth animations AND inputs stay reliably focusable.

/**
 * Serve the built web app over http://localhost so Firebase Auth works.
 * Loading from file:// makes the origin "file://" which Firebase rejects
 * with auth/unauthorized-domain; localhost is authorized by default.
 */
function startLocalServer(distDir: string): Promise<string> {
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let filePath = path.join(
          distDir,
          decodeURIComponent(new URL(req.url || "/", "http://x").pathname),
        );
        if (!filePath.startsWith(distDir)) filePath = distDir;
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
          filePath = path.join(distDir, "index.html"); // SPA fallback
        res.setHeader("Content-Type", mime[path.extname(filePath)] || "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.statusCode = 500;
        res.end();
      }
    });
    server.listen(APP_PORT, "127.0.0.1", () =>
      resolve(`http://localhost:${APP_PORT}`),
    );
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 768,
    // Use the native Windows title bar so the app name plus minimize,
    // maximize and close controls are always visible above the web content.
    title: "StudyOS",
    // Match the app's dark theme so even a transient blank frame is not a jarring
    // pure-black flash while content loads.
    backgroundColor: "#0b0f1a",
    frame: true,
    // Appear only when the first frame is ready to paint, so opening feels
    // instant instead of flashing an empty window while the local bundle loads.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Security: keep the renderer sandboxed. Only the preload bridge is
      // visible to the React app; Node.js is not exposed to the renderer.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      paintWhenInitiallyHidden: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl as string);
    // Open devtools in development
    // mainWindow.webContents.openDevTools();
  } else {
    // Serve over http://localhost (Firebase Auth rejects file:// origins)
    const distDir = path.join(__dirname, "../dist");
    startLocalServer(distDir).then((url) => mainWindow?.loadURL(url));
  }

  // Reveal the window only once the first frame is actually paintable — the app
  // then appears all at once (with the dark background behind it) instead of a
  // blank/white shell for the whole load time.
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

// Every popup/window.open/target="_blank" request is handled here. Instead of
  // spawning another app window ("internal browser"), external URLs open in the
  // OS default browser so the user keeps their usual tabs/session. Hosts used by the
  // Firebase Google sign-in flow popup (Google account picker -> auth handler) are
  // allowlisted below, so the sign-in popup can open inside the app window and hand
  // the signed-in user back to this window. The cross-origin redirect flow was the
  // previous approach, but Chrome/Electron third-party storage blocking breaks the
  // authDomain iframe it needs, leaving users stuck on the login page after Google.

  const isFirebaseAuthHost = (url: string): boolean => {
    const { hostname } = new URL(url;
    return (
      hostname === "accounts.google.com" ||
      hostname.startsWith("accounts.") ||
      hostname.endsWith(".google.com") ||
      hostname.endsWith(".googleusercontent.com") ||
      hostname.endsWith(".firebaseapp.com") ||
      hostname.endsWith(".web.app")
    );
  };

  // Firebase sign-in popups MUST open inside the app so the popup + postMessage flow
  // can hand the signed-in user back to this window. Every other window.open/
  // target="_blank" request opens in the OS default browser (same as before).

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isFirebaseAuthHost(url)) {
      // Open as a small, clean dialog (no menu bar) so Google sign-in does not
      // look like an "internal browser" window. The popup + postMessage flow
      // hands the signed-in user back to this window.
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 480,
          height: 640,
          autoHideMenuBar: true,
          backgroundColor: "#ffffff",
          title: "Sign in with Google",
        },
      };
    }
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  // Keep the app window on the app origin (localhost) â€” any other top-level
  // navigation opens in the default browser instead. Firebase's Google OAuth
  // needs the authDomain/accounts.google.com hops, so those are allowlisted and
  // the final redirect back to http://localhost comes home automatically.
  const isAllowedNavigation = (url: string): boolean => {
    try {
      const { hostname, protocol } = new URL(url);
      if (
        protocol === "http:" &&
        (hostname === "localhost" || hostname === "127.0.0.1")
      )
        return true;
      // Firebase web auth domains + Google identity hosts.
      if (
        hostname === "accounts.google.com" ||
        hostname.startsWith("accounts.") ||
        hostname.endsWith(".google.com") ||
        hostname.endsWith(".googleusercontent.com") ||
        hostname.endsWith(".firebaseapp.com") ||
        hostname.endsWith(".web.app")
      )
        return true;
      return false;
    } catch {
      return false;
    }
  };
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAllowedNavigation(url)) return;
    event.preventDefault();
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
  });

  // ---------------------------------------------------------------------------
  // Crash / blank-window recovery (desktop shell).
  //
  // The renderer can crash or hang (all-black window while the title bar and
  // menu stay visible) — most often right after heavy work such as the data
  // sync that follows a fresh Google sign-in. Instead of leaving the user on a
  // dead window we transparently reload the local app.
  // ---------------------------------------------------------------------------
  const reloadAfterFailure = (reason: string): void => {
    const windowRef = mainWindow;
    if (!windowRef || windowRef.isDestroyed()) return;
    if (consecutiveCrashes >= MAX_CRASH_RELOADS) {
      console.error(
        `[main] ${reason} — not reloading (already retried ${consecutiveCrashes} times)`,
      );
      return;
    }
    consecutiveCrashes += 1;
    console.warn(
      `[main] ${reason} — reloading app (attempt ${consecutiveCrashes})`,
    );
    windowRef.webContents.reload();
  };

  mainWindow.webContents.on(
    "render-process-gone",
    (_event, details) => {
      reloadAfterFailure(
        `renderer gone (${details.reason}${details.exitCode ? `, exit ${details.exitCode}` : ""})`,
      );
    },
  );
  // The page stopped responding (frozen UI). Give the recovery the same
  // treatment; a reload is the reliable way out of a hung compositor.
  mainWindow.webContents.on("unresponsive", () => {
    reloadAfterFailure("renderer became unresponsive");
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      // -3 = ERR_ABORTED: navigation was deliberately cancelled — not a failure.
      if (errorCode === -3) return;
      reloadAfterFailure(
        `load failed (${errorCode}: ${errorDescription}) for ${validatedURL}`,
      );
    },
  );
  // A successful load means the failure/crash loop is over — allow reloads again.
  mainWindow.webContents.on("did-finish-load", () => {
    consecutiveCrashes = 0;
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Re-assert focus on the webContents whenever the window gains or regains
  // activation. Some Windows/Chromium versions leave the renderer in a
  // "stuck" state after a blur/focus cycle where clicks no longer focus text
  // fields; re-calling webContents.focus() clears it immediately.
  mainWindow.on("focus", () => mainWindow?.webContents.focus());
  mainWindow.on("show", () => mainWindow?.webContents.focus());

  // Window control events from renderer
  ipcMain.on("window-minimize", () => mainWindow?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow)
      mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
  });
  ipcMain.on("window-close", () => mainWindow?.close());

  // Tell the renderer whether the window is maximized (for the restore icon).
  mainWindow.on("maximize", () =>
    mainWindow?.webContents.send("window-maximized", true),
  );
  mainWindow.on("unmaximize", () =>
    mainWindow?.webContents.send("window-maximized", false),
  );
}

function resolveTrayIcon(): string | null {
  const candidates = [
    // Packaged app: extraResources copies build/icon.png -> resources/icon.png
    path.join(process.resourcesPath, "icon.png"),
    // Repo layout (dev / unpackaged)
    path.join(__dirname, "../build/icon.png"),
    // Legacy location
    path.join(__dirname, "../public/icon.png"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore per-path errors and keep trying
    }
  }
  return null;
}

function createTray() {
  try {
    const iconPath = resolveTrayIcon();
    if (!iconPath) {
      console.warn("Tray icon not found â€” skipping system tray");
      return;
    }
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.warn("Tray icon failed to load â€” skipping system tray");
      return;
    }
    tray = new Tray(icon.resize({ width: 32, height: 32 }));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open",
        click: () => {
          mainWindow?.show();
        },
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setToolTip("StudyOS");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
      mainWindow?.show();
    });
  } catch (e) {
    console.error("Tray creation failed", e);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Initialize auto-updater (no-op in dev unless configured)
  initAutoUpdater();

  // App blocker: usage tracking + app/site blocking
  initAppBlocker();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Simple API: show notification from main
ipcMain.handle("notify", (_evt, { title, body }) => {
  try {
    new Notification({ title, body }).show();
  } catch (e) {
    console.warn("Notification failed", e);
  }
});

// Open a URL in the OS default browser (used by the renderer for external
// links). Only safe, trigger-free schemes are forwarded to the shell.
ipcMain.handle("open-external", (_evt, url: unknown) => {
  if (typeof url !== "string") return;
  if (/^(https?:|mailto:|tel:)/i.test(url)) {
    void shell.openExternal(url);
  }
});

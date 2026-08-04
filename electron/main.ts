import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
} from "electron";
import path from "path";
import { initAutoUpdater } from "./autoUpdater";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    frame: false,
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl as string);
    // Open devtools in development
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Window control events from renderer
  ipcMain.on("window-minimize", () => mainWindow?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow)
      mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
  });
  ipcMain.on("window-close", () => mainWindow?.close());
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, "../public/icon.png");
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
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

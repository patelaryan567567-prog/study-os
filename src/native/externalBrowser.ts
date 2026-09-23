// External-browser helper shared by every platform.
//
// On the web a link just opens a new tab, but inside a wrapper shell
// (Electron desktop / Capacitor mobile) the exact same click would otherwise be
// swallowed by the embedded web view ("internal browser"). This module routes
// every external link to the operating-system default browser instead.
//
// Desktop (Electron): preload exposes `window.electronAPI.openExternal`, which
// ends in `shell.openExternal()` in the main process.
//
// Mobile (Capacitor): a main-frame navigation to a non-app host is intercepted
// natively by `Bridge.launchIntent` and handed to the system browser, so we can
// reuse the existing hook without adding a native plugin.
//
// Web: plain `window.open`. All undefined-safety (missed `window`, no preload
// bridge) falls back to the browser default without throwing.
import { isNative } from "./capacitorBridge";

/** True when the renderer runs inside the packaged Electron desktop app. */
export function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).electronAPI !== "undefined"
  );
}

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function toSafeUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.href);
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Open a URL in the operating-system default browser. Nothing happens for
 * internal/unsupported schemes (`blob:`, `data:`, `file:`, ...) so downloads
 * and app navigation keep working untouched.
 */
export function openExternalUrl(url: string): void {
  const safe = toSafeUrl(url);
  if (!safe) return;

  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.openExternal) {
    void electronAPI.openExternal(safe);
    return;
  }

  if (isNative()) {
    // The Capacitor native layer sees this as a top-level navigation to a host
    // outside the app origin and forwards it to the system browser (returning
    // `true` so the WebView never actually leaves the app).
    window.location.assign(safe);
    return;
  }

  window.open(safe, "_blank", "noreferrer");
}

/**
 * Install a document-level capture handler that routes every external link to
 * the default browser. Same-origin links (router navigation), fragment links,
 * `mailto:`/`tel:` and download anchors are left untouched.
 */
export function installExternalLinkInterceptor(): void {
  if (typeof document === "undefined") return;

  document.addEventListener(
    "click",
    (event) => {
      const element = event.target as Element | null;
      const anchor = element?.closest?.("a[href]");
      if (!anchor) return;

      // Export/download anchors (CSV, .ics, backups, attachments) must not be
      // hijacked — the browser handles them with the `download` intent.
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("?")) return;

      const url = toSafeUrl(href);
      if (!url) return;
      if (new URL(url).origin === window.location.origin) return;

      event.preventDefault();
      event.stopPropagation();
      openExternalUrl(url);
    },
    true,
  );
}
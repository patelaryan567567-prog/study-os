import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isNative } from "@/native/capacitorBridge";
import { showToast } from "@/components/ui/Toast";

/**
 * Android hardware-back handler registry.
 *
 * Pages/overlays register a callback while they are open (modals, drawers,
 * topbar panels). On Android back press the most-recently-opened overlay is
 * closed first; only when nothing is open does the app fall back to in-app
 * page navigation, and finally to a double-press-to-exit on the home screen —
 * so the app is never force-closed by a single back press.
 */
type BackHandler = () => boolean;
let handlers: BackHandler[] = [];

/** Register an open overlay. Returns an unregister function. */
export function registerAndroidBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

/** Close the topmost overlay. Returns true if an overlay handled the press. */
function closeTopOverlay(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true;
  }
  return false;
}

const ROOT_PATHS = new Set(["/", "/login"]);

/**
 * Mirrors the app's persist key so this file stays self-contained.
 */
export function useAndroidBackHandler(): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    let lastExitTs = 0;

    const onBack = (e: Event) => {
      // 1) We always take over the back button.
      (e as any).preventDefault?.();

      // 2) Close an open overlay (modal / drawer / panel) first.
      if (closeTopOverlay()) {
        lastExitTs = 0;
        return;
      }

      // 3) On a normal page: go back one in-app page.
      if (!ROOT_PATHS.has(location.pathname)) {
        lastExitTs = 0;
        try {
          navigate(-1);
        } catch {
          /* no history to go back to — stay put */
        }
        return;
      }

      // 4) On the home screen: double-press-to-exit.
      const now = Date.now();
      if (now - lastExitTs < 2400) {
        const App = (window as any).Capacitor?.App;
        if (App?.exitApp) App.exitApp();
        else if (App?.minimizeApp) App.minimizeApp();
        // No App plugin installed → stay in the app (never force-close).
      } else {
        lastExitTs = now;
        showToast("Press back again to exit", "info");
      }
    };

    document.addEventListener("backbutton", onBack);
    return () => document.removeEventListener("backbutton", onBack);
    // Rebind when the route changes so "is root" stays accurate.
  }, [location.pathname, navigate]);
}

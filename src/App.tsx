import { BrowserRouter, HashRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { AppRoutes } from "@/routes/AppRoutes";
import { GlobalFocusTimer } from "@/components/focus/GlobalFocusTimer";
import { isNative } from "@/native/capacitorBridge";
import { applyAccessibilityPreferences, readAccessibilityPreferences } from "@/services/accessibility";

/**
 * Application entry point.
 *
 * `AppRoutes` owns the full route table (all StudyOS modules) and the
 * authentication guards, while the providers below supply theming, auth state
 * and global toasts. Routing was previously duplicated inline here, which left
 * the newer `AppRoutes` dead code and caused every unlisted path (e.g.
 * `/backlog`, `/revision`, `/notes`, `/ai`) to fall through to the Dashboard
 * catch-all redirect.
 *
 * Router choice: in the desktop build the renderer is loaded from `dist/` via
 * the `file://` protocol, where `BrowserRouter` has no matching URL segment.
 * `HashRouter` (URLs like `studyos:// .../#/dashboard`) works identically on
 * both `file://` and `http(s)://`, so it is used for the desktop app while the
 * browser build keeps clean `BrowserRouter` paths.
 */
const isFileProtocol =
  typeof window !== "undefined" && window.location.protocol === "file:";
const Router = isFileProtocol ? HashRouter : BrowserRouter;

function App() {
  // Framer Motion on the Android WebView is a big source of jank — on low-end
  // devices layout/transform animations replay on every keystroke/tap. The
  // native app runs everything with reduced motion so explicit animations
  // (still needed for dialogs etc.) are turned into cheap opacity fades.
  const [accessibility, setAccessibility] = useState(readAccessibilityPreferences);

  useEffect(() => {
    applyAccessibilityPreferences(accessibility);
  }, []);

  useEffect(() => {
    const refresh = () => setAccessibility(readAccessibilityPreferences());
    window.addEventListener("studyos-accessibility-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("studyos-accessibility-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Desktop Chromium (Electron on Windows in particular) intermittently stops
  // delivering click-to-focus to text fields — the caret and focus ring never
  // appear until the window is minimized+restored. Force-focusing the target
  // at pointerdown (before the native click completes) guarantees the caret
  // appears exactly like a normal browser. Harmless everywhere else too.
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      // Real Electron/Windows root cause: the window can *look* focused but not
      // hold OS keyboard focus — clicks register but the caret never appears.
      // (Native <select> still opens via its OS menu, which is why it worked.)
      // Minimize→restore fixed it by reclaiming real focus; we reclaim it here
      // on every tap, without touching the GPU/compositor.
      if (!document.hasFocus()) window.focus();
      if (document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, []);

  const shouldReduceMotion = isNative() || accessibility.reducedMotion;

  return (
    <Router>
      <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
            <GlobalFocusTimer />
            <ToastContainer />
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </Router>
  );
}

export default App;

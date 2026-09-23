import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { applyNativePlatformClasses } from "@/native/capacitorBridge";
import { installExternalLinkInterceptor, isElectron } from "@/native/externalBrowser";
import App from "./App.tsx";

// Set the "native-app" class on <html> before rendering so the CSS applies the
// mobile-safe-area + performance overrides from the very first frame.
applyNativePlatformClasses();
// Same idea for the packaged Electron desktop app: a scoped class lets the CSS
// disable backdrop-filter and other GPU-compositor features that intermittently
// swallow clicks aimed at text inputs on Windows (see electron/main.ts).
if (isElectron()) document.documentElement.classList.add("electron-app");
// Any external link clicked anywhere in the app now opens in the OS default
// browser (Electron/Capacitor shells) instead of an embedded web view.
installExternalLinkInterceptor();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

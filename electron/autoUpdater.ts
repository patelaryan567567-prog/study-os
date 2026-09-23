// Placeholder auto-update integration using electron-updater.
// To enable: install `electron-updater` and configure publish targets in package.json/electron-builder config.
import { app } from "electron";

// electron-updater is optional — load it lazily so the app still runs
// when the package isn't installed.
function loadAutoUpdater(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("electron-updater").autoUpdater;
  } catch {
    return null;
  }
}

export function initAutoUpdater() {
  const autoUpdater = loadAutoUpdater();
  if (!autoUpdater) {
    console.log("electron-updater not installed — skipping auto-update");
    return;
  }
  try {
    // Set feed url or rely on electron-builder publish config
    autoUpdater.autoDownload = false;
    autoUpdater.on("checking-for-update", () =>
      console.log("Checking for updates"),
    );
    autoUpdater.on("update-available", (info) => {
      console.log("Update available", info);
      autoUpdater.downloadUpdate();
    });
    autoUpdater.on("update-downloaded", () => {
      console.log("Update downloaded");
      autoUpdater.quitAndInstall();
    });

    if (process.env.NODE_ENV === "production") {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    }
  } catch (e) {
    console.warn("AutoUpdater init failed", e);
  }
}

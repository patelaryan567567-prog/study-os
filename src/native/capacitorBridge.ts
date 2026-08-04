// Lightweight Capacitor bridge for web code to call native features when running in a Capacitor app.
// This file is a safe wrapper: it falls back to web APIs when Capacitor is not available.

export async function notifyNative(title: string, body: string) {
  try {
    if ((window as any).Capacitor) {
      const { Notifications } = await import("@capacitor/" + "notifications");
      await Notifications.schedule({
        notifications: [{ title, body, id: Date.now() }],
      });
      return true;
    }
  } catch (e) {
    console.warn("native notify failed", e);
  }
  // fallback to browser Notification
  if ("Notification" in window && Notification.permission === "granted")
    new Notification(title, { body });
  return false;
}

export function isNative() {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNative
  );
}

export async function getNetworkStatus() {
  try {
    if (isNative()) {
      const { Network } = await import("@capacitor/" + "network");
      return await Network.getStatus();
    }
  } catch (e) {
    console.warn(e);
  }
  return { connected: navigator.onLine, connectionType: "unknown" } as any;
}

export async function scheduleLocalReminder(
  title: string,
  body: string,
  timeIso: string,
) {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import(
        "@capacitor/" + "local-notifications"
      );
      const id = Math.floor(Math.random() * 100000);
      await LocalNotifications.schedule({
        notifications: [
          { id, title, body, schedule: { at: new Date(timeIso) } },
        ],
      });
      return true;
    }
  } catch (e) {
    console.warn("scheduleLocalReminder failed", e);
  }
  return false;
}

// Lightweight Capacitor bridge for web code to call native features when running
// in a Capacitor app. Safe wrapper: every helper falls back to a web API when the
// native app (or the optional native plugin) is not available.
//
// NOTE: keep this file free of unresolved `@capacitor/...` dynamic imports — the
// optional plugins (notifications/network) are not installed, so importing them
// breaks the web bundle.

export function isNative() {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    ((window as any).Capacitor.isNativePlatform?.() ||
      (window as any).Capacitor.isNative)
  );
}

/** A Capacitor plugin exposed by the native layer (e.g. "AppBlocker"). */
export function hasNativePlugin(name: string): boolean {
  try {
    return Boolean((window as any).Capacitor?.Plugins?.[name]);
  } catch {
    return false;
  }
}

/**
 * Marks the app as running inside the Android/iOS app container so the CSS can
 * disable expensive desktop effects (backdrop-filter, ambient orbs) and reserve
 * system-bar safe areas. Must run before the first paint.
 */
export function applyNativePlatformClasses(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isNative()) {
    root.classList.add("native-app");
  } else {
    root.classList.remove("native-app");
  }
}

function webNotification(title: string, body: string): boolean {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body });
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

// Capacitor's LocalNotifications plugin is optional — when installed it is used
// on Android/iOS to deliver real system notifications with an app icon; the web
// bundle never imports it directly (see the file header note).
function nativePlugin(name: string): any {
  return (window as any).Capacitor?.Plugins?.[name];
}

export async function notifyNative(title: string, body: string) {
  const LocalNotifications = nativePlugin("LocalNotifications");
  if (LocalNotifications) {
    try {
      await LocalNotifications.schedule?.({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() / 1000) % 2147483647,
            smallIcon: undefined,
            iconColor: "#8b5cf6",
            channelId: "studyos-reminders",
          },
        ],
      });
      return true;
    } catch {
      /* fall through to web notification */
    }
  }
  return webNotification(title, body);
}

export async function getNetworkStatus() {
  const StatusBar = nativePlugin("Network");
  if (StatusBar?.getStatus) {
    try {
      const info = await StatusBar.getStatus();
      return {
        connected: info?.connected ?? navigator.onLine,
        connectionType: info?.connectionType || "unknown",
      };
    } catch {
      /* ignore */
    }
  }
  return { connected: navigator.onLine, connectionType: "unknown" } as {
    connected: boolean;
    connectionType: string;
  };
}

/** Web fallback for local reminders: schedules a browser notification at timeIso. */
export async function scheduleLocalReminder(
  title: string,
  body: string,
  timeIso: string,
) {
  const LocalNotifications = nativePlugin("LocalNotifications");
  if (LocalNotifications) {
    const delayMs = new Date(timeIso).getTime() - Date.now();
    try {
      await LocalNotifications.schedule?.({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() / 1000) % 2147483647,
            schedule: { at: new Date(timeIso) },
          },
        ],
      });
      return true;
    } catch {
      /* fall through */
    }
    if (delayMs > 0) {
      window.setTimeout(() => {
        void notifyNative(title, body);
      }, delayMs);
      return true;
    }
    return false;
  }

  const delay = new Date(timeIso).getTime() - Date.now();
  if (delay <= 0) return false;
  window.setTimeout(() => {
    webNotification(title, body);
  }, delay);
  return true;
}

/** Light haptic feedback on native devices (no-op on web). */
export function nativeHaptics(kind: "impact" | "selection" = "impact"): void {
  const Haptics = nativePlugin("Haptics");
  if (!Haptics) return;
  void (kind === "selection"
    ? Haptics.selectionStart?.()
    : Haptics.impact?.({ style: "MEDIUM" }));
}

/** Share text via the native share sheet when available (falls back to clipboard). */
export async function nativeShare(
  text: string,
  title?: string,
): Promise<boolean> {
  const Share = nativePlugin("Share");
  if (Share?.share) {
    try {
      await Share.share({ title: title || "StudyOS", text });
      return true;
    } catch {
      /* user cancelled */
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: title || "StudyOS", text });
      return true;
    } catch {
      /* ignore */
    }
  }
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* ignore */
  }
  return false;
}

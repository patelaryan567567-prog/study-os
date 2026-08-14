import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNetworkStatus,
  isNative,
  notifyNative,
  scheduleLocalReminder,
} from '@/native/capacitorBridge';

type NotificationStub = {
  new (title: string, options?: { body?: string }): object;
  permission: string;
};

const notificationCalls: Array<{ title: string; body?: string }> = [];

function installNotification(permission: 'granted' | 'denied' | 'default') {
  const stub = function (this: object, title: string, options?: { body?: string }) {
    notificationCalls.push({ title, body: options?.body });
  } as unknown as NotificationStub;
  stub.permission = permission;
  Object.defineProperty(window, 'Notification', {
    value: stub,
    configurable: true,
    writable: true,
  });
}

function setCapacitor(value: unknown) {
  Object.defineProperty(window, 'Capacitor', {
    value,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  notificationCalls.length = 0;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'Capacitor');
  Reflect.deleteProperty(window, 'Notification');
});

describe('isNative', () => {
  it('is false when Capacitor is absent', () => {
    expect(isNative()).toBe(false);
  });

  it('is false when Capacitor is present but running on the web', () => {
    setCapacitor({ isNative: false });
    expect(isNative()).toBe(false);
  });

  it('is true inside a native Capacitor shell', () => {
    setCapacitor({ isNative: true });
    expect(isNative()).toBe(true);
  });
});

describe('notifyNative', () => {
  it('falls back to a browser notification when permission is granted', async () => {
    installNotification('granted');

    await expect(notifyNative('Time to study', 'Physics at 5pm')).resolves.toBe(false);
    expect(notificationCalls).toEqual([{ title: 'Time to study', body: 'Physics at 5pm' }]);
  });

  it('does not notify when browser permission has not been granted', async () => {
    installNotification('default');

    await expect(notifyNative('Time to study', 'Physics')).resolves.toBe(false);
    expect(notificationCalls).toEqual([]);
  });

  it('does not throw when the Notification API is unavailable', async () => {
    await expect(notifyNative('Time to study', 'Physics')).resolves.toBe(false);
    expect(notificationCalls).toEqual([]);
  });

  it('warns and falls back when the native plugin cannot be loaded', async () => {
    setCapacitor({ isNative: true });
    installNotification('granted');

    await expect(notifyNative('Time to study', 'Physics')).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalled();
    expect(notificationCalls).toHaveLength(1);
  });
});

describe('getNetworkStatus', () => {
  it('reports the browser online state on the web', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    await expect(getNetworkStatus()).resolves.toEqual({
      connected: true,
      connectionType: 'unknown',
    });
  });

  it('reports an offline browser', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await expect(getNetworkStatus()).resolves.toEqual({
      connected: false,
      connectionType: 'unknown',
    });
  });

  it('falls back to the browser state when the native plugin fails to load', async () => {
    setCapacitor({ isNative: true });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    await expect(getNetworkStatus()).resolves.toEqual({
      connected: true,
      connectionType: 'unknown',
    });
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('scheduleLocalReminder', () => {
  it('reports failure on the web where there is no scheduler', async () => {
    await expect(
      scheduleLocalReminder('Revision', 'Chapter 3', '2026-03-12T10:00:00.000Z'),
    ).resolves.toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns and reports failure when the native scheduler cannot be loaded', async () => {
    setCapacitor({ isNative: true });

    await expect(
      scheduleLocalReminder('Revision', 'Chapter 3', '2026-03-12T10:00:00.000Z'),
    ).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });
});

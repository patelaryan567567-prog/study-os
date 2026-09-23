import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  usesNativeWindowFrame: true,
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  onMaximizeChange: (cb: (maximized: boolean) => void) => {
    const handler = (_e: unknown, maximized: boolean) => cb(!!maximized);
    ipcRenderer.on("window-maximized", handler);
    return () => ipcRenderer.removeListener("window-maximized", handler);
  },
  notify: (payload: { title: string; body: string }) =>
    ipcRenderer.invoke("notify", payload),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  blocker: {
    getStatus: () => ipcRenderer.invoke("blocker:getStatus"),
    setRules: (rules: unknown[]) => ipcRenderer.invoke("blocker:setRules", rules),
    setFocusMode: (on: boolean) => ipcRenderer.invoke("blocker:setFocusMode", on),
    checkPermissions: () => ipcRenderer.invoke("blocker:checkPermissions"),
    requestPermissions: () => ipcRenderer.invoke("blocker:requestPermissions"),
    getDnsBlocker: () => ipcRenderer.invoke("blocker:getDnsBlocker"),
    setDnsBlocker: (disabled: boolean) =>
      ipcRenderer.invoke("blocker:setDnsBlocker", disabled),
    listApps: () => ipcRenderer.invoke("blocker:listApps"),
    onUsage: (cb: (data: { usage: Record<string, number> }) => void) => {
      const handler = (_e: unknown, data: { usage: Record<string, number> }) => cb(data);
      ipcRenderer.on("blocker:usage", handler);
      return () => ipcRenderer.removeListener("blocker:usage", handler);
    },
    onBlocked: (cb: (data: { ruleId: string; name: string; reason: string }) => void) => {
      const handler = (_e: unknown, data: { ruleId: string; name: string; reason: string }) => cb(data);
      ipcRenderer.on("blocker:blocked", handler);
      return () => ipcRenderer.removeListener("blocker:blocked", handler);
    },
  },
});

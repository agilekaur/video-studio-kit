// Bridge for the editor page: menu commands, files opened from the Dock / File menu, and disk-to-backend uploads.
const { contextBridge, ipcRenderer } = require("electron");

const on = (channel) => (cb) => {
  const h = (_e, arg) => cb(arg);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld("vsDesktop", {
  onMenu: on("vs:menu"),
  onFiles: on("vs:files"),
  upload: (pid, kind, paths) => ipcRenderer.invoke("vs:upload", { pid, kind, paths }),
});

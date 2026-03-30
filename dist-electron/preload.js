"use strict";

// preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("lexentia", {
  workspace: {
    openFolder: () => import_electron.ipcRenderer.invoke("workspace:openFolder"),
    get: () => import_electron.ipcRenderer.invoke("workspace:get")
  },
  fs: {
    listDir: (relPath) => import_electron.ipcRenderer.invoke("fs:listDir", relPath),
    readFile: (relPath) => import_electron.ipcRenderer.invoke("fs:readFile", relPath),
    writeFile: (relPath, content) => import_electron.ipcRenderer.invoke("fs:writeFile", relPath, content)
  },
  terminal: {
    create: (opts) => import_electron.ipcRenderer.invoke("term:create", opts),
    write: (id, data) => import_electron.ipcRenderer.invoke("term:write", id, data),
    resize: (id, cols, rows) => import_electron.ipcRenderer.invoke("term:resize", id, cols, rows),
    kill: (id) => import_electron.ipcRenderer.invoke("term:kill", id),
    onData: (cb) => {
      const listener = (_evt, payload) => cb(payload);
      import_electron.ipcRenderer.on("term:data", listener);
      return () => import_electron.ipcRenderer.removeListener("term:data", listener);
    }
  },
  git: {
    run: (command, args) => import_electron.ipcRenderer.invoke("git:run", command, args)
  },
  window: {
    minimize: () => import_electron.ipcRenderer.invoke("win:minimize"),
    toggleMaximize: () => import_electron.ipcRenderer.invoke("win:toggleMaximize"),
    close: () => import_electron.ipcRenderer.invoke("win:close"),
    isMaximized: () => import_electron.ipcRenderer.invoke("win:isMaximized")
  },
  extension: {
    install: () => Promise.resolve({ ok: false, error: "Extensions support disabled" }),
    getInstalled: () => Promise.resolve({ ok: true, installed: [] }),
    getCommands: () => Promise.resolve({ ok: true, commands: [] }),
    executeCommand: () => Promise.resolve({ ok: false, error: "Extensions support disabled" })
  }
});

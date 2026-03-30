import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('lexentia', {
  workspace: {
    openFolder: () => ipcRenderer.invoke('workspace:openFolder'),
    get: () => ipcRenderer.invoke('workspace:get'),
  },
  fs: {
    listDir: (relPath: string) => ipcRenderer.invoke('fs:listDir', relPath),
    readFile: (relPath: string) => ipcRenderer.invoke('fs:readFile', relPath),
    writeFile: (relPath: string, content: string) => ipcRenderer.invoke('fs:writeFile', relPath, content),
  },
  terminal: {
    create: (opts?: { cwd?: string | null }) => ipcRenderer.invoke('term:create', opts),
    write: (id: string, data: string) => ipcRenderer.invoke('term:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('term:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke('term:kill', id),
    onData: (cb: (payload: { id: string; data: string }) => void) => {
      const listener = (_evt: any, payload: { id: string; data: string }) => cb(payload)
      ipcRenderer.on('term:data', listener)
      return () => ipcRenderer.removeListener('term:data', listener)
    },
  },
  git: {
    run: (command: string, args: string[]) => ipcRenderer.invoke('git:run', command, args),
  },
  window: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('win:toggleMaximize'),
    close: () => ipcRenderer.invoke('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  },
  extension: {
    install: () => Promise.resolve({ ok: false, error: 'Extensions support disabled' }),
    getInstalled: () => Promise.resolve({ ok: true, installed: [] }),
    getCommands: () => Promise.resolve({ ok: true, commands: [] }),
    executeCommand: () => Promise.resolve({ ok: false, error: 'Extensions support disabled' }),
  },
})


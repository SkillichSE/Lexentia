import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('lexentia', {
  workspace: {
    openFolder: () => ipcRenderer.invoke('workspace:openFolder'),
    get: () => ipcRenderer.invoke('workspace:get'),
    newFile: () => ipcRenderer.invoke('workspace:newFile'),
    pickFile: () => ipcRenderer.invoke('workspace:pickFile'),
  },
  fs: {
    listDir: (relPath: string) => ipcRenderer.invoke('fs:listDir', relPath),
    readFile: (relPath: string) => ipcRenderer.invoke('fs:readFile', relPath),
    writeFile: (relPath: string, content: string) => ipcRenderer.invoke('fs:writeFile', relPath, content),
  },
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    read: (name: string) => ipcRenderer.invoke('skills:read', name),
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
  window: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('win:toggleMaximize'),
    close: () => ipcRenderer.invoke('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  },
})


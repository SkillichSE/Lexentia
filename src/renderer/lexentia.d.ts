export {}

declare global {
  interface Window {
    lexentia: {
      workspace: {
        openFolder: () => Promise<{ ok: boolean; workspaceRoot?: string }>
        get: () => Promise<{ ok: boolean; workspaceRoot: string | null }>
      }
      fs: {
        listDir: (
          relPath: string,
        ) => Promise<{
          ok: boolean
          entries?: { name: string; isDir: boolean; size: number; mtimeMs: number }[]
          error?: string
        }>
        readFile: (relPath: string) => Promise<{ ok: boolean; content?: string; error?: string }>
        writeFile: (relPath: string, content: string) => Promise<{ ok: boolean; error?: string }>
      }
      terminal: {
        create: (opts?: { cwd?: string | null }) => Promise<{ ok: boolean; id?: string }>
        write: (id: string, data: string) => Promise<{ ok: boolean; error?: string }>
        resize: (id: string, cols: number, rows: number) => Promise<{ ok: boolean }>
        kill: (id: string) => Promise<{ ok: boolean }>
        onData: (cb: (payload: { id: string; data: string }) => void) => () => void
      }
      git: {
        run: (command: string, args: string[]) => Promise<{ ok: boolean; output: string; error?: string }>
      }
      extension: {
        install: (namespace: string, name: string) => Promise<{
          ok: boolean
          installed?: { namespace: string; name: string; displayName: string; version: string; description: string; installedAt: number }[]
          commands?: string[]
          error?: string
        }>
        getInstalled: () => Promise<{ ok: boolean; installed: { namespace: string; name: string; displayName: string; version: string; description: string; installedAt: number }[] }>
        getCommands: () => Promise<{ ok: boolean; commands: string[]; error?: string }>
        executeCommand: (id: string, ...args: any[]) => Promise<{ ok: boolean; result?: any; error?: string }>
      }
      window: {
        minimize: () => Promise<{ ok: boolean }>
        toggleMaximize: () => Promise<{ ok: boolean; isMaximized: boolean }>
        close: () => Promise<{ ok: boolean }>
        isMaximized: () => Promise<{ ok: boolean; isMaximized: boolean }>
      }
    }
  }
}

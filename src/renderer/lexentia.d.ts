export {}

declare global {
  interface Window {
    lexentia: {
      workspace: {
        openFolder: () => Promise<{ ok: boolean; workspaceRoot?: string }>
        get: () => Promise<{ ok: boolean; workspaceRoot: string | null }>
        newFile: () => Promise<{ ok: boolean; relPath?: string; error?: string }>
        pickFile: () => Promise<{ ok: boolean; relPath?: string; error?: string }>
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
      skills: {
        list: () => Promise<{
          ok: boolean
          entries?: { name: string; size: number; mtimeMs: number }[]
          error?: string
        }>
        read: (name: string) => Promise<{ ok: boolean; content?: string; error?: string }>
      }
      terminal: {
        create: (opts?: { cwd?: string | null }) => Promise<{ ok: boolean; id?: string }>
        write: (id: string, data: string) => Promise<{ ok: boolean; error?: string }>
        resize: (id: string, cols: number, rows: number) => Promise<{ ok: boolean }>
        kill: (id: string) => Promise<{ ok: boolean }>
        onData: (cb: (payload: { id: string; data: string }) => void) => () => void
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

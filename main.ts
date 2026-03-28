import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fsp from 'node:fs/promises'
import * as pty from 'node-pty'

let toolRunnerProc: ReturnType<typeof spawn> | null = null
let workspaceRoot: string | null = null
const skillsRoot = path.join(__dirname, '../skills')
type TerminalEntry =
  | { kind: 'pty'; ptyProcess: pty.IPty; cwd: string | null }
  | { kind: 'proc'; process: ChildProcessWithoutNullStreams; cwd: string | null }
const terminals = new Map<string, TerminalEntry>()

async function isToolRunnerUp(baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/health`)
    return res.ok
  } catch {
    return false
  }
}

async function ensureToolRunner() {
  const baseUrl = 'http://127.0.0.1:8000'
  const isUp = await isToolRunnerUp(baseUrl)
  if (isUp) return

  const pythonBin = process.platform === 'win32' ? 'python' : 'python3'
  const scriptPath = path.join(__dirname, '../python/tool_runner.py')

  if (!fs.existsSync(scriptPath)) {
    console.warn('[Lexentia] tool_runner.py not found; tools will be unavailable.')
    return
  }

  toolRunnerProc = spawn(pythonBin, [scriptPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  })

  toolRunnerProc.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.warn(`[Lexentia] tool runner exited with code ${code}`)
  })
}

async function isDevServerUp(url: string) {
  try {
    const res = await fetch(url, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // MVP: allow local HTTP calls (Ollama/tools) without CORS friction.
      // Production should re-enable webSecurity and properly handle CORS.
      webSecurity: false,
    },
  })

  const distIndexPath = path.join(__dirname, '../dist/renderer/index.html')
  const rendererDevUrl = 'http://localhost:5173/'

  ;(async () => {
    const devUp = await isDevServerUp(rendererDevUrl)
    const loadTarget = devUp ? rendererDevUrl : fs.existsSync(distIndexPath) ? `file://${distIndexPath}` : rendererDevUrl
    await win.loadURL(loadTarget)
    // eslint-disable-next-line no-console
    console.log(`[Lexentia] Renderer loaded from: ${loadTarget}`)
  })()

  return win
}

function isWithinWorkspace(absPath: string) {
  if (!workspaceRoot) return false
  const rel = path.relative(workspaceRoot, absPath)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function resolveInWorkspace(relPath: string) {
  if (!workspaceRoot) throw new Error('Workspace is not set')
  const abs = path.resolve(workspaceRoot, relPath)
  if (!isWithinWorkspace(abs) && abs !== workspaceRoot) {
    throw new Error('Path is outside workspace')
  }
  return abs
}

function registerIpcHandlers() {
  ipcMain.handle('win:minimize', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (!win) return { ok: false }
    win.minimize()
    return { ok: true }
  })

  ipcMain.handle('win:toggleMaximize', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (!win) return { ok: false, isMaximized: false }
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return { ok: true, isMaximized: win.isMaximized() }
  })

  ipcMain.handle('win:close', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (!win) return { ok: false }
    win.close()
    return { ok: true }
  })

  ipcMain.handle('win:isMaximized', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (!win) return { ok: false, isMaximized: false }
    return { ok: true, isMaximized: win.isMaximized() }
  })

  ipcMain.handle('workspace:openFolder', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Open Folder',
      properties: ['openDirectory'],
    })
    if (res.canceled || res.filePaths.length === 0) return { ok: false }
    workspaceRoot = res.filePaths[0]
    return { ok: true, workspaceRoot }
  })

  ipcMain.handle('workspace:get', async () => {
    return { ok: true, workspaceRoot }
  })

  ipcMain.handle('fs:listDir', async (_evt, relPath: string) => {
    const abs = resolveInWorkspace(relPath || '.')
    const entries = await fsp.readdir(abs, { withFileTypes: true })
    const mapped = await Promise.all(
      entries.map(async (e) => {
        const childAbs = path.join(abs, e.name)
        const st = await fsp.stat(childAbs)
        return {
          name: e.name,
          isDir: e.isDirectory(),
          size: st.size,
          mtimeMs: st.mtimeMs,
        }
      }),
    )
    // directories first, then alpha
    mapped.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return { ok: true, entries: mapped }
  })

  ipcMain.handle('fs:readFile', async (_evt, relPath: string) => {
    const abs = resolveInWorkspace(relPath)
    const data = await fsp.readFile(abs, 'utf-8')
    return { ok: true, content: data }
  })

  ipcMain.handle('fs:writeFile', async (_evt, relPath: string, content: string) => {
    const abs = resolveInWorkspace(relPath)
    await fsp.mkdir(path.dirname(abs), { recursive: true })
    await fsp.writeFile(abs, content ?? '', 'utf-8')
    return { ok: true }
  })

  ipcMain.handle('skills:list', async () => {
    try {
      if (!fs.existsSync(skillsRoot)) return { ok: true, entries: [] as { name: string; size: number; mtimeMs: number }[] }
      const entries = await fsp.readdir(skillsRoot, { withFileTypes: true })
      const files = entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((name) => name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.txt'))
      const mapped = await Promise.all(
        files.map(async (name) => {
          const abs = path.join(skillsRoot, name)
          const st = await fsp.stat(abs)
          return { name, size: st.size, mtimeMs: st.mtimeMs }
        }),
      )
      mapped.sort((a, b) => a.name.localeCompare(b.name))
      return { ok: true, entries: mapped }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) }
    }
  })

  ipcMain.handle('skills:read', async (_evt, name: string) => {
    try {
      const safe = String(name ?? '').trim()
      if (!safe || safe.includes('..') || safe.includes('/') || safe.includes('\\')) return { ok: false, error: 'Invalid skill name' }
      const abs = path.join(skillsRoot, safe)
      if (!abs.startsWith(skillsRoot)) return { ok: false, error: 'Invalid skill path' }
      const content = await fsp.readFile(abs, 'utf-8')
      return { ok: true, content }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) }
    }
  })

  ipcMain.handle('term:create', async (evt, opts?: { cwd?: string | null }) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (!win) return { ok: false }

    const id = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
    const cwd = opts?.cwd ?? workspaceRoot ?? process.cwd()

    try {
      const p = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        cwd,
        env: process.env as any,
      })

      terminals.set(id, { kind: 'pty', ptyProcess: p, cwd })
      p.onData((data) => {
        win.webContents.send('term:data', { id, data })
      })
      p.onExit(() => {
        terminals.delete(id)
        win.webContents.send('term:data', { id, data: '\r\n[terminal exited]\r\n' })
      })
    } catch (error) {
      // Fallback for environments where node-pty native module is unavailable.
      const fallback = spawn(shell, [], {
        cwd,
        env: process.env,
        stdio: 'pipe',
      })
      terminals.set(id, { kind: 'proc', process: fallback, cwd })
      fallback.stdout.on('data', (chunk) => {
        win.webContents.send('term:data', { id, data: String(chunk) })
      })
      fallback.stderr.on('data', (chunk) => {
        win.webContents.send('term:data', { id, data: String(chunk) })
      })
      fallback.on('exit', () => {
        terminals.delete(id)
        win.webContents.send('term:data', { id, data: '\r\n[terminal exited]\r\n' })
      })
      // eslint-disable-next-line no-console
      console.warn('[Lexentia] node-pty failed; using fallback terminal process:', error)
    }

    return { ok: true, id }
  })

  ipcMain.handle('term:write', async (_evt, id: string, data: string) => {
    const t = terminals.get(id)
    if (!t) return { ok: false }
    if (t.kind === 'pty') {
      t.ptyProcess.write(String(data ?? ''))
    } else {
      t.process.stdin.write(String(data ?? ''))
    }
    return { ok: true }
  })

  ipcMain.handle('term:resize', async (_evt, id: string, cols: number, rows: number) => {
    const t = terminals.get(id)
    if (!t) return { ok: false }
    if (t.kind === 'pty') {
      t.ptyProcess.resize(Math.max(2, cols | 0), Math.max(2, rows | 0))
    }
    return { ok: true }
  })

  ipcMain.handle('term:kill', async (_evt, id: string) => {
    const t = terminals.get(id)
    if (!t) return { ok: false }
    try {
      if (t.kind === 'pty') t.ptyProcess.kill()
      else t.process.kill()
    } finally {
      terminals.delete(id)
    }
    return { ok: true }
  })
}

app.whenReady().then(() => {
  // Remove default native menu (File/Edit/View/Window/Help).
  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createMainWindow()
  // MVP offline: tools run locally (no remote dependencies).
  void ensureToolRunner()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try {
    toolRunnerProc?.kill()
  } catch {
    // ignore
  }
})


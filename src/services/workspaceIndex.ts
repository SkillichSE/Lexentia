// lightweight workspace scan + chunk estimate (placeholder for future vector index)

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'vendor', '__pycache__', '.venv', 'build', '.next'])
const TEXT_EXT = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'md',
  'css',
  'html',
  'py',
  'rs',
  'go',
  'toml',
  'yaml',
  'yml',
  'txt',
  'sh',
  'ps1',
])

export type IndexState = {
  status: 'idle' | 'scanning' | 'ready' | 'error'
  fileCount: number
  chunkEstimate: number
  progress: number
  error?: string
}

const CHUNK = 480

async function walk(rel: string): Promise<string[]> {
  const res = await window.lexentia.fs.listDir(rel)
  if (!res.ok || !res.entries) return []
  const out: string[] = []
  for (const e of res.entries) {
    const childRel = rel === '.' ? e.name : `${rel}/${e.name}`
    if (e.isDir) {
      if (EXCLUDE_DIRS.has(e.name)) continue
      out.push(...(await walk(childRel)))
    } else {
      const ext = e.name.includes('.') ? e.name.split('.').pop()!.toLowerCase() : ''
      if (ext && !TEXT_EXT.has(ext)) continue
      out.push(childRel)
    }
  }
  return out
}

async function estimateChunks(relPath: string): Promise<number> {
  const res = await window.lexentia.fs.readFile(relPath)
  if (!res.ok || res.content == null) return 0
  const slice = res.content.slice(0, 120_000)
  return Math.max(1, Math.ceil(slice.length / CHUNK))
}

export async function scanWorkspace(
  onProgress: (p: IndexState) => void,
  opts?: { maxFiles?: number },
): Promise<{ files: string[]; chunks: number }> {
  const maxFiles = opts?.maxFiles ?? 400
  onProgress({ status: 'scanning', fileCount: 0, chunkEstimate: 0, progress: 0 })
  try {
    const files = (await walk('.')).slice(0, maxFiles)
    let chunks = 0
    const step = Math.max(1, Math.floor(files.length / 20))
    for (let i = 0; i < files.length; i++) {
      chunks += await estimateChunks(files[i])
      if (i % step === 0 || i === files.length - 1) {
        const progress = Math.round(((i + 1) / files.length) * 100)
        onProgress({
          status: 'scanning',
          fileCount: files.length,
          chunkEstimate: chunks,
          progress,
        })
      }
    }
    onProgress({ status: 'ready', fileCount: files.length, chunkEstimate: chunks, progress: 100 })
    return { files, chunks }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    onProgress({ status: 'error', fileCount: 0, chunkEstimate: 0, progress: 0, error: msg })
    return { files: [], chunks: 0 }
  }
}

export function simpleCodebaseSearch(query: string, files: string[], snippets: Map<string, string>, maxHits = 8): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: { path: string; score: number }[] = []
  const terms = q.split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  for (const rel of files) {
    const text = snippets.get(rel)
    if (!text) continue
    const low = text.toLowerCase()
    let score = 0
    for (const t of terms) {
      if (low.includes(t)) score += 1
    }
    if (score > 0) hits.push({ path: rel, score })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, maxHits).map((h) => h.path)
}

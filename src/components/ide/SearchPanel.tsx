import { useEffect, useMemo, useRef, useState } from 'react'

type Match = {
  relPath: string
  line: number
  preview: string
}

export function SearchPanel({
  workspaceRoot,
  files,
  onOpenAtLine,
  onRequestIndex,
  onReplaceFiles,
}: {
  workspaceRoot: string | null
  files: string[]
  onOpenAtLine: (relPath: string, line: number) => void
  onRequestIndex?: () => void
  onReplaceFiles?: (updates: { relPath: string; content: string }[], meta: { query: string; replace: string; hitCount: number }) => void
}) {
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [running, setRunning] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [scanned, setScanned] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const canSearch = useMemo(() => Boolean(workspaceRoot) && files.length > 0, [files.length, workspaceRoot])

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    if (!workspaceRoot) return
    if (files.length === 0) return
    setRunning(true)
    setMatches([])
    setScanned(0)

    const maxResults = 200
    const maxBytes = 400_000
    const limitFiles = Math.min(files.length, 1200)
    const needle = q.toLowerCase()
    const out: Match[] = []

    try {
      for (let i = 0; i < limitFiles; i++) {
        const relPath = files[i]
        const res = await window.lexentia.fs.readFile(relPath)
        setScanned(i + 1)
        if (!res.ok || !res.content) continue
        const content = String(res.content)
        if (content.length > maxBytes) continue

        const lines = content.split('\n')
        for (let li = 0; li < lines.length; li++) {
          const lineText = lines[li]
          if (lineText.toLowerCase().includes(needle)) {
            out.push({ relPath, line: li + 1, preview: lineText.trim().slice(0, 220) })
            if (out.length >= maxResults) break
          }
        }
        if (out.length >= maxResults) break
      }
    } finally {
      setMatches(out)
      setRunning(false)
    }
  }

  const runReplaceAll = async () => {
    const q = query.trim()
    if (!q) return
    if (!workspaceRoot) return
    if (files.length === 0) return
    if (!replace) return

    const ok = window.confirm(`Replace all occurrences of "${q}" with "${replace}" in indexed files?`)
    if (!ok) return

    setRunning(true)
    const needle = q
    const repl = replace
    const updates: { relPath: string; content: string }[] = []
    let hitCount = 0

    try {
      const limitFiles = Math.min(files.length, 1200)
      const maxBytes = 400_000
      for (let i = 0; i < limitFiles; i++) {
        const relPath = files[i]
        const res = await window.lexentia.fs.readFile(relPath)
        setScanned(i + 1)
        if (!res.ok || !res.content) continue
        const content = String(res.content)
        if (content.length > maxBytes) continue
        if (!content.includes(needle)) continue
        const replaced = content.split(needle).join(repl)
        if (replaced !== content) {
          // count approximate hits for reporting
          hitCount += content.split(needle).length - 1
          updates.push({ relPath, content: replaced })
        }
      }
    } finally {
      setRunning(false)
    }

    if (updates.length === 0) {
      setMatches([])
      return
    }

    onReplaceFiles?.(updates, { query: q, replace: repl, hitCount })
  }

  return (
    <div className="lex-searchPanel">
      <div className="lex-sectionTitle">Search</div>
      <div className="lex-field">
        <input
          ref={inputRef}
          className="lex-input"
          value={query}
          placeholder={canSearch ? 'Search in workspace…' : 'Index files first (Ctrl/⌘+P → Index workspace files)'}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Enter') void runSearch()
          }}
          disabled={!workspaceRoot}
        />
      </div>

      <div className="lex-field">
        <input
          className="lex-input"
          value={replace}
          placeholder="Replace with…"
          onChange={(e) => setReplace(e.target.value)}
          disabled={!workspaceRoot}
        />
      </div>

      <div className="lex-field lex-field--row">
        <button className="lex-btn lex-btn--primary" onClick={() => void runSearch()} disabled={!canSearch || running || !query.trim()}>
          Search
        </button>
        <button className="lex-btn" onClick={() => void runReplaceAll()} disabled={!canSearch || running || !query.trim() || !replace}>
          Replace all
        </button>
        <button className="lex-btn" onClick={() => onRequestIndex?.()} disabled={!workspaceRoot || running}>
          Index
        </button>
        <div className="lex-subtle">{running ? `scanning ${scanned}/${Math.min(files.length, 1200)}…` : `${matches.length} result(s)`}</div>
      </div>

      <div className="lex-searchResults" role="list" aria-label="Search results">
        {matches.length === 0 ? (
          <div className="lex-empty">{running ? 'Searching…' : 'No results'}</div>
        ) : (
          matches.map((m, idx) => (
            <button
              key={`${m.relPath}:${m.line}:${idx}`}
              className="lex-searchHit"
              onClick={() => onOpenAtLine(m.relPath, m.line)}
              type="button"
            >
              <div className="lex-searchHitTop">
                <span className="lex-searchHitFile">{m.relPath}</span>
                <span className="lex-searchHitLine">:{m.line}</span>
              </div>
              <div className="lex-searchHitPreview">{m.preview}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}


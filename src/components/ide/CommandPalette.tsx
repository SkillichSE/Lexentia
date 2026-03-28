import { useEffect, useMemo, useRef, useState } from 'react'

export type CommandItem = {
  id: string
  label: string
  detail?: string
  kind?: 'command' | 'file'
  onRun: () => void
}

function scoreMatch(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 1
  if (t === q) return 1000
  if (t.startsWith(q)) return 300
  if (t.includes(q)) return 120
  // very small fuzzy: all chars in order
  let ti = 0
  let hits = 0
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    ti = t.indexOf(c, ti)
    if (ti === -1) return 0
    hits++
    ti++
  }
  return 40 + hits
}

export function CommandPalette({
  open,
  title = 'Command Palette',
  placeholder = 'Type a command or file name…',
  items,
  onClose,
}: {
  open: boolean
  title?: string
  placeholder?: string
  items: CommandItem[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim()
    const scored = items
      .map((it) => ({ it, s: scoreMatch(q, `${it.label} ${it.detail ?? ''}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.it)
    return scored
  }, [items, query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, open])

  if (!open) return null

  const run = (idx: number) => {
    const it = filtered[idx]
    if (!it) return
    it.onRun()
    onClose()
  }

  return (
    <div className="lex-cmdkOverlay" role="dialog" aria-label="Command Palette" onMouseDown={onClose}>
      <div className="lex-cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lex-cmdkHeader">
          <div className="lex-sectionTitle lex-sectionTitle--small">{title}</div>
          <div className="lex-subtle">Esc</div>
        </div>
        <input
          ref={inputRef}
          className="lex-input lex-cmdkInput"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((p) => Math.min(filtered.length - 1, p + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((p) => Math.max(0, p - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(active)
            }
          }}
        />

        <div className="lex-cmdkList" role="listbox" aria-label="Commands list">
          {filtered.length === 0 ? (
            <div className="lex-empty">No matches</div>
          ) : (
            filtered.map((it, idx) => (
              <button
                key={it.id}
                className={idx === active ? 'lex-cmdkItem lex-cmdkItem--active' : 'lex-cmdkItem'}
                onMouseEnter={() => setActive(idx)}
                onClick={() => run(idx)}
                type="button"
              >
                <div className="lex-cmdkItemMain">
                  <div className="lex-cmdkItemLabel">{it.label}</div>
                  {it.detail ? <div className="lex-cmdkItemDetail">{it.detail}</div> : null}
                </div>
                <div className="lex-cmdkItemKind">{it.kind === 'file' ? 'FILE' : 'CMD'}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


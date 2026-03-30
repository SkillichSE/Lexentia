import { useMemo, useRef, useState } from 'react'
import type { PrivacyEntry } from '../../services/privacyLog'

const KIND_LABEL: Record<string, string> = {
  model_outbound: 'Model / API',
  local_tools: 'Local tools',
  indexing: 'Index / PC',
  file_scope: 'Files',
  note: 'Notes',
}

export function PrivacyTopBar({ entries }: { entries: PrivacyEntry[] }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const latest = entries[0]
  const summary = useMemo(() => {
    if (!latest) return 'No events'
    return latest.title
  }, [latest])

  const openHover = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <div
      className="lex-privacyTopBar"
      onMouseEnter={openHover}
      onMouseLeave={scheduleClose}
      role="presentation"
    >
      <button type="button" className="lex-privacyTopBarBtn" aria-expanded={open}>
        <span className="lex-privacyTopBarDot" aria-hidden />
        <span className="lex-privacyTopBarLabel">Privacy</span>
        <span className="lex-privacyTopBarSummary">{summary}</span>
      </button>
      {open ? (
        <div className="lex-privacyTopPopover" role="dialog" aria-label="Activity log: data interactions">
          <div className="lex-privacyTopPopoverIntro">
            Real-time events: local operations, model requests, indexing, files. Data never leaves your PC except for explicit requests to your chosen API.
          </div>
          <ul className="lex-privacyTopPopoverList">
            {entries.length === 0 ? (
              <li className="lex-privacyTopPopoverItem lex-privacyTopPopoverItem--empty">No events yet</li>
            ) : (
              entries.map((e) => (
                <li key={e.id} className="lex-privacyTopPopoverItem">
                  <span className="lex-privacyTopPopoverKind">{KIND_LABEL[e.kind] ?? e.kind}</span>
                  <span className="lex-privacyTopPopoverTime">{new Date(e.at).toLocaleTimeString()}</span>
                  <span className="lex-privacyTopPopoverTitle">{e.title}</span>
                  {e.detail ? <span className="lex-privacyTopPopoverDetail">{e.detail}</span> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

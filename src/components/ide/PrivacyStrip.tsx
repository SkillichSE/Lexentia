import { useMemo, useState } from 'react'
import type { PrivacyEntry } from '../../services/privacyLog'

export function PrivacyStrip({ entries }: { entries: PrivacyEntry[] }) {
  const [open, setOpen] = useState(false)
  const latest = entries[0]

  const summary = useMemo(() => {
    if (!latest) return 'No data events yet. Requests stay on your machine unless you use a remote API.'
    return latest.title
  }, [latest])

  return (
    <div className="lex-privacyStrip">
      <button type="button" className="lex-privacyStripToggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="lex-privacyStripLabel">Privacy & data</span>
        <span className="lex-privacyStripSummary">{summary}</span>
      </button>
      {open ? (
        <ul className="lex-privacyStripList" role="list">
          {entries.length === 0 ? (
            <li className="lex-privacyStripItem">Nothing logged. Code and prompts are not uploaded in offline / local mode.</li>
          ) : (
            entries.map((e) => (
              <li key={e.id} className="lex-privacyStripItem">
                <span className="lex-privacyStripTime">{new Date(e.at).toLocaleTimeString()}</span>
                <span className="lex-privacyStripTitle">{e.title}</span>
                {e.detail ? <span className="lex-privacyStripDetail">{e.detail}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

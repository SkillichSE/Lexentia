import { useEffect } from 'react'
import { DiffEditor } from '@monaco-editor/react'

export function DiffModal({
  open,
  title,
  original,
  modified,
  language,
  onClose,
}: {
  open: boolean
  title: string
  original: string
  modified: string
  language: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="lex-cmdkOverlay" role="dialog" aria-label="Diff Preview" onMouseDown={onClose}>
      <div className="lex-diffModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lex-cmdkHeader">
          <div className="lex-sectionTitle lex-sectionTitle--small">{title}</div>
          <button className="lex-btn" onClick={onClose} type="button">Close</button>
        </div>
        <div className="lex-diffBody">
          <DiffEditor
            height="520px"
            original={original}
            modified={modified}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  )
}


import { useEffect, useRef } from 'react'

export type StatusPaletteKind = 'encoding' | 'language' | null

export function StatusBar({
  branch,
  errorCount,
  warningCount,
  line,
  col,
  spaces,
  encoding,
  languageMode,
  modelHint,
  modelLabel,
  indexLabel,
  tokenEstimate,
  paletteKind,
  onOpenPalette,
  onClosePalette,
  onSelectEncoding,
  onSelectLanguage,
}: {
  branch: string
  errorCount: number
  warningCount: number
  line: number
  col: number
  spaces: number
  encoding: string
  languageMode: string
  modelHint: string
  modelLabel: string
  indexLabel: string
  tokenEstimate: string
  paletteKind: StatusPaletteKind
  onOpenPalette: (kind: 'encoding' | 'language') => void
  onClosePalette: () => void
  onSelectEncoding: (value: string) => void
  onSelectLanguage: (value: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!paletteKind) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClosePalette()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [paletteKind, onClosePalette])

  return (
    <div className="lex-statusBar" ref={wrapRef}>
      <div className="lex-statusBarLeft">
        <span className="lex-statusItem" title="Git branch">
          <svg className="lex-statusIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M2.6 10.59c.48.5.52.51 1.17 1.17 1.17 1.17 1.17 3.07 0 4.24-1.17 1.17-3.07 1.17-4.24 0-.65-.65-.69-.68-1.17-1.17L2.6 10.59zM9.5 2.59c-.48.5-.52.51-1.17 1.17-1.17 1.17-1.17 3.07 0 4.24 1.17 1.17 3.07 1.17 4.24 0 .65-.65.69-.68 1.17-1.17L9.5 2.59zM9.5 14.41c.48.5.52.51 1.17 1.17 1.17 1.17 3.07 1.17 4.24 0 1.17-1.17 1.17-3.07 0-4.24-.65-.65-.69-.68-1.17-1.17L9.5 14.41zM16.4 10.59c.48.5.52.51 1.17 1.17 1.17 1.17 1.17 3.07 0 4.24-1.17 1.17-3.07 1.17-4.24 0-.65-.65-.69-.68-1.17-1.17L16.4 10.59z" />
          </svg>
          {branch}
        </span>
        <span className="lex-statusItem" title="Problems">
          <svg className="lex-statusIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
          {errorCount}
        </span>
        <span className="lex-statusItem" title="Warnings">
          <svg className="lex-statusIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          {warningCount}
        </span>
        {modelHint ? <span className="lex-statusItem lex-statusItem--muted">{modelHint}</span> : null}
        <span className="lex-statusItem" title="Active model profile">
          {modelLabel}
        </span>
        <span className="lex-statusItem" title="Workspace index">
          {indexLabel}
        </span>
      </div>
      <div className="lex-statusBarRight">
        <span className="lex-statusItem" title="Rough prompt size estimate">
          {tokenEstimate}
        </span>
        <span className="lex-statusItem">
          Ln {line}, Col {col}
        </span>
        <span className="lex-statusItem">Spaces: {spaces}</span>
        <button type="button" className="lex-statusBtn" onClick={() => onOpenPalette('encoding')}>
          {encoding}
        </button>
        <button type="button" className="lex-statusBtn" onClick={() => onOpenPalette('language')}>
          {languageMode}
        </button>
      </div>

      {paletteKind === 'encoding' ? (
        <div className="lex-commandPalette" role="menu">
          <div className="lex-commandPaletteTitle">encoding</div>
          {['UTF-8', 'UTF-16 LE', 'Windows-1252'].map((enc) => (
            <button key={enc} type="button" className="lex-commandPaletteItem" role="menuitem" onClick={() => onSelectEncoding(enc)}>
              {enc}
            </button>
          ))}
        </div>
      ) : null}
      {paletteKind === 'language' ? (
        <div className="lex-commandPalette" role="menu">
          <div className="lex-commandPaletteTitle">language mode</div>
          {['JSON', 'TypeScript', 'JavaScript', 'Python', 'Plain text'].map((lang) => (
            <button key={lang} type="button" className="lex-commandPaletteItem" role="menuitem" onClick={() => onSelectLanguage(lang)}>
              {lang}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

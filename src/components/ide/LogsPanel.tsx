export function LogsPanel({
  lines,
  onClear,
}: {
  lines: string[]
  onClear?: () => void
}) {
  return (
    <div className="lex-logsPanelWrap">
      <div className="lex-logsHeader">
        <div className="lex-subtle">Realtime</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="lex-btn" onClick={() => navigator.clipboard.writeText(lines.join('\n'))}>
            Copy
          </button>
          <button className="lex-btn" onClick={() => onClear?.()}>
            Clear
          </button>
        </div>
      </div>
      <div className="lex-logsPanel" role="log" aria-label="Logs">
        {lines.map((line, idx) => (
          <div className="lex-logLine" key={`${idx}-${line}`}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}


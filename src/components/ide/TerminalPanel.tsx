import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export function TerminalPanel({
  cwd,
  terminalId,
  onTerminalId,
}: {
  cwd?: string | null
  terminalId?: string | null
  onTerminalId?: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [termId, setTermId] = useState<string | null>(terminalId ?? null)

  const hint = useMemo(() => (termId ? '' : 'Starting terminal…'), [termId])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      theme: {
        background: '#0b1020',
        foreground: '#e6e9ff',
        cursor: '#7dd3fc',
        selectionBackground: 'rgba(125,211,252,0.25)',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    let disposeOnData: (() => void) | null = null
    let activeId: string | null = null

    ;(async () => {
      try {
        if (terminalId) {
          activeId = terminalId
          setTermId(terminalId)
        } else {
          const res = await window.lexentia.terminal.create({ cwd })
          if (!res.ok || !res.id) {
            term.writeln('\r\n[failed to start terminal]')
            return
          }
          activeId = res.id
          setTermId(res.id)
          onTerminalId?.(res.id)
        }

        disposeOnData = window.lexentia.terminal.onData((p) => {
          if (p.id !== activeId) return
          term.write(p.data)
        })

        term.onData((data) => {
          if (!activeId) return
          void window.lexentia.terminal.write(activeId, data).catch(() => {
            term.writeln('\r\n[terminal write failed]')
          })
        })
      } catch {
        term.writeln('\r\n[failed to initialize terminal]')
      }
    })()

    const onResize = () => {
      fit.fit()
      if (activeId) {
        void window.lexentia.terminal.resize(activeId, term.cols, term.rows)
      }
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      try {
        disposeOnData?.()
      } catch {
        // ignore
      }
      if (activeId) {
        void window.lexentia.terminal.kill(activeId)
      }
      term.dispose()
    }
  }, [cwd, onTerminalId, terminalId])

  return (
    <div className="lex-terminalWrap">
      <div className="lex-terminalHeader">
        <div className="lex-sectionTitle lex-sectionTitle--small">Terminal</div>
        <div className="lex-subtle">{hint || (termId ? `id: ${termId}` : '')}</div>
      </div>
      <div className="lex-terminal" ref={containerRef} />
    </div>
  )
}


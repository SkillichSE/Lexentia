import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type BeforeMount } from '@monaco-editor/react'
import type { editor as MEditor } from 'monaco-editor'
import type * as Monaco from 'monaco-editor'

export function EditorPanel({
  activeFile,
  fileRelPath,
  onChange,
  onSave,
  extractedText,
  onCursorPosition,
  onInlineAi,
  onExplainLine,
  onFixLine,
}: {
  activeFile?: { relPath: string; content: string; isDirty: boolean } | null
  /** When set, Alt+E / Alt+F and line hints use this path (split editor). Defaults to activeFile.relPath. */
  fileRelPath?: string | null
  onChange?: (content: string) => void
  onSave?: () => void
  extractedText?: string | null
  onCursorPosition?: (line: number, col: number) => void
  onInlineAi?: (args: { instruction: string; selection: string }) => Promise<string | null>
  onExplainLine?: (line: number) => void
  onFixLine?: (line: number) => void
}) {
  const [value, setValue] = useState('')
  const [inlineOpen, setInlineOpen] = useState(false)
  const [inlineDraft, setInlineDraft] = useState('')
  const [inlineBusy, setInlineBusy] = useState(false)
  const [hoverLine, setHoverLine] = useState<number | null>(null)
  const [hintPos, setHintPos] = useState<{ top: number; left: number } | null>(null)
  const [lineHasDiag, setLineHasDiag] = useState(false)
  const edRef = useRef<MEditor.IStandaloneCodeEditor | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const hoverLineRef = useRef<number | null>(null)
  const pathRef = useRef<string | null>(null)
  const explainRef = useRef(onExplainLine)
  const fixRef = useRef(onFixLine)

  const resolvedPath = fileRelPath ?? activeFile?.relPath ?? null

  useEffect(() => {
    pathRef.current = resolvedPath
  }, [resolvedPath])
  useEffect(() => {
    explainRef.current = onExplainLine
  }, [onExplainLine])
  useEffect(() => {
    fixRef.current = onFixLine
  }, [onFixLine])

  useEffect(() => {
    if (activeFile) {
      setValue(activeFile.content)
      return
    }
    if (!extractedText) return
    setValue((prev) => (prev.trim().length === 0 ? extractedText : prev))
  }, [activeFile?.relPath, activeFile?.content, extractedText])

  const language = useMemo(() => {
    const name = activeFile?.relPath ?? ''
    if (name.endsWith('.py')) return 'python'
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript'
    if (name.endsWith('.js') || name.endsWith('.jsx')) return 'javascript'
    if (name.endsWith('.json')) return 'json'
    if (name.endsWith('.md')) return 'markdown'
    if (name.endsWith('.css')) return 'css'
    if (name.endsWith('.html')) return 'html'
    if (name.endsWith('.sh')) return 'shell'
    return 'plaintext'
  }, [activeFile?.relPath])

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('lexentia-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#000000',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#ffffff',
        'editor.lineHighlightBackground': '#1f1f23',
        'editor.selectionBackground': 'rgba(96, 165, 250, 0.22)',
      },
    })
  }

  const lineHasMarker = (editor: MEditor.IStandaloneCodeEditor, monaco: typeof Monaco, line: number) => {
    const model = editor.getModel()
    if (!model) return false
    const markers = monaco.editor.getModelMarkers({ resource: model.uri })
    return markers.some(
      (m) =>
        m.startLineNumber <= line &&
        m.endLineNumber >= line &&
        (m.severity === monaco.MarkerSeverity.Error || m.severity === monaco.MarkerSeverity.Warning),
    )
  }

  const updateHoverHint = (editor: MEditor.IStandaloneCodeEditor, monaco: typeof Monaco, line: number) => {
    const model = editor.getModel()
    if (!model) return
    const col = model.getLineMaxColumn(line)
    const coords = editor.getScrolledVisiblePosition({ lineNumber: line, column: col })
    if (!coords) return
    setHintPos({ top: coords.top, left: coords.left + 4 })
    setLineHasDiag(lineHasMarker(editor, monaco, line))
  }

  const runInline = async () => {
    const ed = edRef.current
    const instruction = inlineDraft.trim()
    if (!ed || !instruction || !onInlineAi) return
    const sel = ed.getSelection()
    const model = ed.getModel()
    const selectionText = sel && model ? model.getValueInRange(sel) : ''
    setInlineBusy(true)
    try {
      const next = await onInlineAi({ instruction, selection: selectionText })
      if (next != null && sel) {
        ed.executeEdits('lex-inline-ai', [{ range: sel, text: next }])
      }
    } finally {
      setInlineBusy(false)
      setInlineOpen(false)
      setInlineDraft('')
    }
  }

  return (
    <div className="lex-editorPanel">
      {!activeFile ? (
        <div className="lex-editorEmpty">
          <div className="lex-editorEmptyContent">
            <div className="lex-editorEmptyTitle">No file open</div>
            <div className="lex-editorEmptyHint">
              <p>Open a file from Explorer or create a new one</p>
              <div className="lex-editorEmptyShortcuts">
                <div><kbd>Ctrl+S</kbd> Save</div>
                <div><kbd>Ctrl+K</kbd> Inline edit (with selection)</div>
                <div><kbd>Alt+E</kbd> Explain line</div>
                <div><kbd>Alt+F</kbd> Fix error</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {inlineOpen ? (
            <div className="lex-inlineAiBackdrop" role="presentation" onMouseDown={() => setInlineOpen(false)} />
          ) : null}
          {inlineOpen ? (
            <div className="lex-inlineAiPopover">
              <div className="lex-inlineAiTitle">inline edit (ctrl+k)</div>
              <textarea
                className="lex-inlineAiInput"
                value={inlineDraft}
                placeholder="describe the change; selection is sent only when you confirm"
                onChange={(e) => setInlineDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setInlineOpen(false)
                  }
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void runInline()
              }
            }}
            autoFocus
          />
          <div className="lex-inlineAiActions">
            <button type="button" className="lex-btn lex-btn--small" onClick={() => setInlineOpen(false)}>
              cancel
            </button>
            <button type="button" className="lex-btn lex-btn--primary lex-btn--small" disabled={inlineBusy} onClick={() => void runInline()}>
              {inlineBusy ? '…' : 'run'}
            </button>
          </div>
        </div>
      ) : null}
      <div
        className="lex-editorMonaco"
        ref={hostRef}
        onMouseLeave={() => {
          hoverLineRef.current = null
          setHoverLine(null)
          setHintPos(null)
        }}
      >
        {hoverLine != null && hintPos && resolvedPath ? (
          <div className="lex-editorLineHint" style={{ top: hintPos.top, left: hintPos.left }}>
            <span className="lex-editorLineHintKey">Alt+E</span>
            <span className="lex-editorLineHintLabel">explain</span>
            {lineHasDiag ? (
              <>
                <span className="lex-editorLineHintSep">·</span>
                <span className="lex-editorLineHintKey">Alt+F</span>
                <span className="lex-editorLineHintLabel">fix</span>
              </>
            ) : null}
          </div>
        ) : null}
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          theme="lexentia-dark"
          value={value}
          beforeMount={beforeMount}
          onChange={(v) => {
            const next = v ?? ''
            setValue(next)
            onChange?.(next)
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            lineNumbersMinChars: 3,
            padding: { top: 8 },
          }}
          onMount={(editor, monaco) => {
            edRef.current = editor
            const report = () => {
              const pos = editor.getPosition()
              if (pos && onCursorPosition) onCursorPosition(pos.lineNumber, pos.column)
            }
            report()
            editor.onDidChangeCursorPosition(report)
            editor.onDidScrollChange(() => {
              const h = hoverLineRef.current
              if (h != null) updateHoverHint(editor, monaco, h)
            })
            editor.onMouseMove((e) => {
              const pos = e.target.position
              if (!pos || !pathRef.current) {
                hoverLineRef.current = null
                setHoverLine(null)
                setHintPos(null)
                return
              }
              hoverLineRef.current = pos.lineNumber
              setHoverLine(pos.lineNumber)
              updateHoverHint(editor, monaco, pos.lineNumber)
            })
            editor.onDidChangeModelContent(() => {
              const h = hoverLineRef.current
              if (h != null) updateHoverHint(editor, monaco, h)
            })
            const markerDisposable = monaco.editor.onDidChangeMarkers(() => {
              const h = hoverLineRef.current
              if (h != null) setLineHasDiag(lineHasMarker(editor, monaco, h))
            })
            editor.onDidDispose(() => {
              markerDisposable.dispose()
            })
            editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyE, () => {
              const p = editor.getPosition()
              if (p && pathRef.current) explainRef.current?.(p.lineNumber)
            })
            editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
              const p = editor.getPosition()
              if (p && pathRef.current && lineHasMarker(editor, monaco, p.lineNumber)) fixRef.current?.(p.lineNumber)
            })
            editor.onKeyDown((e) => {
              const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')
              if (isSave) {
                e.preventDefault()
                onSave?.()
                return
              }
              const isInline = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')
              if (isInline && onInlineAi) {
                e.preventDefault()
                e.stopPropagation()
                setInlineOpen(true)
                setInlineDraft('')
              }
            })
          }}
        />
      </div>
        </>
      )}
    </div>
  )
}

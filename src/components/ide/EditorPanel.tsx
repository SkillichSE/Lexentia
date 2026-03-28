import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

export function EditorPanel({
  activeFile,
  onChange,
  onSave,
  extractedText,
  hasWorkspace,
  onOpenFile,
  onNewFile,
  onOpenFolder,
  developersUrl,
}: {
  activeFile?: { relPath: string; content: string; isDirty: boolean } | null
  onChange?: (content: string) => void
  onSave?: () => void | Promise<void>
  extractedText?: string | null
  hasWorkspace?: boolean
  onOpenFile?: () => void | Promise<void>
  onNewFile?: () => void | Promise<void>
  onOpenFolder?: () => void | Promise<void>
  developersUrl?: string
}) {
  const [value, setValue] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!activeFile) return
    setValue(activeFile.content)
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

  return (
    <div className="lex-editorPanel">
      <div className="lex-editorHeader">
        <div className="lex-sectionTitle lex-sectionTitle--small">Editor</div>
        <div className="lex-subtle">
          {activeFile ? (
            <>
              {activeFile.relPath} {activeFile.isDirty ? '•' : ''}
            </>
          ) : (
            <>No file selected.</>
          )}
        </div>
      </div>

      {activeFile ? (
        <div className="lex-editorMonaco">
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            theme="vs-dark"
            value={value}
            onChange={(v) => {
              const next = v ?? ''
              setValue(next)
              onChange?.(next)
            }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              wordWrap: 'on',
            }}
            onMount={(editor) => {
              editor.onKeyDown((e) => {
                const isSave = (e.ctrlKey || e.metaKey) && e.code === 'KeyS'
                if (!isSave) return
                e.preventDefault()
                onSave?.()
              })
            }}
          />
        </div>
      ) : (
        <div className="lex-editorEmpty">
          <div className="lex-emptyHint">
            {hasWorkspace ? 'Choose a file from Explorer to start editing.' : 'Open a folder first to enable file operations.'}
          </div>
          <div className="lex-emptyActions">
            <button
              className="lex-btn lex-btn--primary"
              type="button"
              disabled={!hasWorkspace}
              onClick={onOpenFile}
            >
              Open File…
            </button>
            <button
              className="lex-btn"
              type="button"
              disabled={!hasWorkspace}
              onClick={onNewFile}
            >
              New File…
            </button>
            <button className="lex-btn" type="button" onClick={onOpenFolder}>
              Open Folder…
            </button>
          </div>
          <div className="lex-emptyFooter">
            <a
              href={developersUrl ?? 'https://github.com/SkillichSE/Lexentia/tree/master'}
              target="_blank"
              rel="noreferrer"
            >
              Developers & Founders
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

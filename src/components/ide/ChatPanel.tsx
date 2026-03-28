import { useEffect, useMemo, useRef, useState } from 'react'
import { ClarificationMenu } from '../ClarificationMenu'
import type { LexAction } from '../../services/modelService'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

export function ChatPanel({
  messages,
  onSend,
  inputRef,
  clarification,
  onClarificationSelect,
  actionsByMessageId,
  onApproveAction,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  clarification?: { question: string; options: string[] } | null
  onClarificationSelect?: (opt: string) => void
  actionsByMessageId?: Record<string, LexAction[] | undefined>
  onApproveAction?: (messageId: string, action: LexAction) => void
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const [filePreviewProgress, setFilePreviewProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const placeholder = useMemo(
    () => 'Describe your task... (Ctrl/⌘ + Enter to send)',
    [],
  )

  const send = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  // Input is only blocked while we're actively waiting for a clarification answer.
  // Once the clarification menu is shown, the user should interact with it — not type.
  const inputBlocked = !!clarification

  return (
    <div className="lex-chatPanel">
      <div className="lex-chatList" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === 'user' ? 'lex-msg lex-msg--user' : 'lex-msg lex-msg--assistant'}
          >
            <div className="lex-msgRole">{m.role === 'user' ? 'You' : 'Lexentia'}</div>
            {/* FIX: render newlines properly so code and multi-line answers display correctly */}
            <div className="lex-msgContent">
              {m.content.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>

            {m.role === 'assistant' && actionsByMessageId?.[m.id]?.length ? (
              <div className="lex-actions">
                {actionsByMessageId[m.id]!.some((a) => a.type === 'fs.writeFile') ? (
                  <div style={{ marginBottom: 10 }}>
                    {actionsByMessageId[m.id]!
                      .filter((a): a is Extract<LexAction, { type: 'fs.writeFile' }> => a.type === 'fs.writeFile')
                      .map((a, idx) => (
                        <FileWritePreview
                          key={`${m.id}-fw-${idx}`}
                          messageId={m.id}
                          relPath={a.relPath}
                          content={a.content ?? ''}
                          progress={filePreviewProgress[m.id] ?? 0}
                          onProgress={(p) => setFilePreviewProgress((prev) => ({ ...prev, [m.id]: p }))}
                        />
                      ))}
                  </div>
                ) : null}
                <div className="lex-subtle" style={{ marginBottom: 6 }}>
                  Proposed actions (require confirmation):
                </div>
                <div className="lex-actionsList">
                  {actionsByMessageId[m.id]!.map((a, idx) => (
                    <div className="lex-actionRow" key={`${m.id}-a-${idx}`}>
                      <div className="lex-actionMeta">
                        <div className="lex-actionType">{a.type}</div>
                        {'command' in a ? <div className="lex-actionDetail">{a.command}</div> : null}
                        {'relPath' in a ? <div className="lex-actionDetail">{a.relPath}</div> : null}
                        {'name' in a ? <div className="lex-actionDetail">{a.name}</div> : null}
                        {'content' in a && a.type === 'fs.writeFile' ? <div className="lex-actionDetail">(content {String(a.content ?? '').length} chars)</div> : null}
                      </div>
                      <button className="lex-btn lex-btn--primary" onClick={() => onApproveAction?.(m.id, a)}>
                        Execute
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* FIX: clarification menu always renders when clarification is set,
          independently of whether JSON parse succeeded — guard moved here */}
      {clarification && Array.isArray(clarification.options) && clarification.options.length >= 2 ? (
        <ClarificationMenu
          question={clarification.question}
          options={clarification.options}
          onSelect={(opt) => onClarificationSelect?.(opt)}
        />
      ) : null}

      <div className="lex-chatComposer">
        <textarea
          ref={inputRef}
          className="lex-chatInput"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (inputBlocked) return
            if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
              e.preventDefault()
              send()
            }
          }}
          disabled={inputBlocked}
        />
        <div className="lex-chatActions">
          <button className="lex-btn lex-btn--primary" onClick={send} disabled={inputBlocked}>
            Send
          </button>
          <div className="lex-hint">Ctrl/⌘ + Enter</div>
        </div>
      </div>
    </div>
  )
}

function FileWritePreview({
  messageId,
  relPath,
  content,
  progress,
  onProgress,
}: {
  messageId: string
  relPath: string
  content: string
  progress: number
  onProgress: (p: number) => void
}) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    if (!content) return
    if (progress >= content.length) return

    const id = window.setInterval(() => {
      onProgress((prev) => {
        const cur = typeof prev === 'number' ? prev : 0
        if (cur >= content.length) return cur
        const nextNl = content.indexOf('\n', cur)
        const next = nextNl === -1 ? content.length : Math.min(content.length, nextNl + 1)
        return next
      })
    }, 55)

    return () => window.clearInterval(id)
  }, [content, onProgress, open, progress])

  const shown = content.slice(0, Math.max(0, Math.min(content.length, progress)))
  const done = progress >= content.length

  return (
    <div className="lex-filePreview" aria-label={`File preview ${relPath}`}>
      <div className="lex-filePreviewHeader">
        <div className="lex-filePreviewTitle">{relPath}</div>
        <div className="lex-filePreviewRight">
          <div className="lex-subtle">{done ? 'Done' : 'Writing…'}</div>
          <button className="lex-btn" type="button" onClick={() => setOpen((p) => !p)}>
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {open ? (
        <pre className="lex-filePreviewCode">
          <code>{shown || (done ? '' : '\n')}</code>
        </pre>
      ) : null}
      {/* keep keying by messageId to avoid reuse glitches */}
      <div style={{ display: 'none' }}>{messageId}</div>
    </div>
  )
}
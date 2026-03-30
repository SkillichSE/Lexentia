import { forwardRef, useEffect, useMemo, useRef, useState, type ForwardedRef } from 'react'
import { ClarificationMenu } from '../ClarificationMenu'
import { PlanCard } from './PlanCard'
import type { ChatPlanBlock } from './chatPlanTypes'

export type { ChatPlanBlock } from './chatPlanTypes'

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatAttachment = {
  id: string
  name: string
  mime: string
  dataUrl?: string
  textPreview?: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  attachments?: ChatAttachment[]
  plan?: ChatPlanBlock
}

export type ChatPanelRef = {
  addAttachment: (attachment: ChatAttachment) => void
}

function id() {
  return `a-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

const MAX_ATTACH_BYTES = 800_000

function ChatPanelImpl(
  {
    messages,
    onSend,
    inputRef,
    clarification,
    onClarificationSelect,
    mentionCandidates,
    onPlanAllow,
    onPlanReject,
  }: {
    messages: ChatMessage[]
    onSend: (text: string, options?: { attachments?: ChatAttachment[] }) => void
    inputRef?: React.RefObject<HTMLTextAreaElement | null>
    clarification?: { question: string; options: string[] } | null
    onClarificationSelect?: (opt: string) => void
    mentionCandidates?: string[]
    onPlanAllow?: (messageId: string) => void
    onPlanReject?: (messageId: string) => void
  },
  ref: ForwardedRef<ChatPanelRef>,
) {
  const [draft, setDraft] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Expose addAttachment method to parent components
  useRef<ChatPanelRef>(null)
  useEffect(() => {
    if (ref) {
      const handleRef = { addAttachment: (att: ChatAttachment) => setPendingFiles((p) => [...p, att]) } as ChatPanelRef
      if (typeof ref === 'function') {
        ref(handleRef)
      } else {
        ref.current = handleRef
      }
    }
  }, [ref])

  const candidates = mentionCandidates ?? []

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const filteredMentions = useMemo(() => {
    const q = mentionFilter.toLowerCase()
    if (!q) return candidates.slice(0, 24)
    return candidates.filter((p) => p.toLowerCase().includes(q)).slice(0, 24)
  }, [candidates, mentionFilter])

  const placeholder = useMemo(
    () =>
      'Message… @file, @codebase. Explain/fix: Alt+E / Alt+F. "+" — files. Ctrl/⌘+Enter — send.',
    [],
  )

  const insertMention = (path: string) => {
    setDraft((d) => {
      const i = d.lastIndexOf('@')
      if (i < 0) return `${d}@${path} `
      return `${d.slice(0, i)}@${path} `
    })
    setMentionOpen(false)
    setMentionFilter('')
  }

  const readFileAsAttachment = (file: File): Promise<ChatAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const att: ChatAttachment = { id: id(), name: file.name, mime: file.type || 'application/octet-stream' }
      if (file.size > MAX_ATTACH_BYTES) {
        resolve({
          ...att,
          textPreview: `[File too large for attachment: ${file.name}, ${Math.round(file.size / 1024)} KB; max ~${Math.round(MAX_ATTACH_BYTES / 1024)} KB]`,
        })
        return
      }
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        reader.onload = () => {
          att.dataUrl = typeof reader.result === 'string' ? reader.result : undefined
          resolve(att)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
        return
      }
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.tsx') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.py')
      ) {
        reader.onload = () => {
          att.textPreview = typeof reader.result === 'string' ? reader.result : ''
          resolve(att)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
        return
      }
      att.textPreview = `[${file.name}] (${file.type || 'binary'}) — binary attachment without text preview.`
      resolve(att)
    })
  }

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const next: ChatAttachment[] = []
    for (let i = 0; i < list.length; i++) {
      try {
        next.push(await readFileAsAttachment(list[i]!))
      } catch {
        next.push({
          id: id(),
          name: list[i]!.name,
          mime: list[i]!.type,
          textPreview: '[Failed to read file]',
        })
      }
    }
    setPendingFiles((p) => [...p, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const send = () => {
    const text = draft.trim()
    const atts = pendingFiles.length ? pendingFiles : undefined
    if (!text && !atts) return
    onSend(text, atts?.length ? { attachments: atts } : undefined)
    setDraft('')
    setPendingFiles([])
    setMentionOpen(false)
  }

  const planBlocksInput = useMemo(
    () =>
      messages.some((m) => m.plan?.approval === 'pending') || messages.some((m) => Boolean(m.plan?.executing)),
    [messages],
  )
  const inputBlocked = !!clarification || planBlocksInput

  return (
    <div className="lex-chatPanel">
      <div className="lex-chatList" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'lex-msg lex-msg--user'
                : m.role === 'system'
                  ? 'lex-msg lex-msg--system'
                  : 'lex-msg lex-msg--assistant'
            }
          >
            <div className="lex-msgRole">
              {m.role === 'user' ? 'You' : m.role === 'system' ? 'Activity' : 'Lexentia'}
            </div>
            {m.attachments?.length ? (
              <div className="lex-msgAttachments">
                {m.attachments.map((a) => (
                  <span key={a.id} className="lex-msgAttachChip">
                    {a.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="lex-msgContent">
              {m.content.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
            {m.role === 'assistant' && m.plan ? (
              <PlanCard
                plan={m.plan}
                disabled={Boolean(m.plan.executing)}
                onAllow={() => onPlanAllow?.(m.id)}
                onReject={() => onPlanReject?.(m.id)}
              />
            ) : null}
          </div>
        ))}
      </div>

      {clarification && Array.isArray(clarification.options) && clarification.options.length >= 2 ? (
        <ClarificationMenu
          question={clarification.question}
          options={clarification.options}
          onSelect={(opt) => onClarificationSelect?.(opt)}
        />
      ) : null}

      <div className="lex-chatComposer">
        {mentionOpen ? (
          <div className="lex-mentionMenu" role="listbox">
            {filteredMentions.length === 0 ? (
              <div className="lex-mentionEmpty">no matches</div>
            ) : (
              filteredMentions.map((p) => (
                <button key={p} type="button" className="lex-mentionItem" role="option" onClick={() => insertMention(p)}>
                  @{p}
                </button>
              ))
            )}
          </div>
        ) : null}
        {pendingFiles.length > 0 ? (
          <div className="lex-chatPendingFiles">
            {pendingFiles.map((a) => (
              <span key={a.id} className="lex-chatPendingChip">
                {a.name}
                <button
                  type="button"
                  className="lex-chatPendingRemove"
                  aria-label="Remove"
                  onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== a.id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="lex-chatInputRow">
          <input
            ref={fileInputRef}
            type="file"
            className="lex-chatFileInput"
            multiple
            accept="*/*"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            className="lex-chatAttachBtn"
            title="Attach files (images, audio, video, text…)"
            disabled={inputBlocked}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
          <textarea
            ref={inputRef}
            className="lex-chatInput lex-chatInput--withAttach"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value
              setDraft(v)
              const last = v.lastIndexOf('@')
              if (last >= 0 && last === v.length - 1) {
                setMentionOpen(true)
                setMentionFilter('')
              } else if (last >= 0 && mentionOpen) {
                const frag = v.slice(last + 1)
                if (frag.includes(' ') || frag.includes('\n')) {
                  setMentionOpen(false)
                } else {
                  setMentionFilter(frag)
                }
              }
            }}
            onKeyDown={(e) => {
              if (inputBlocked) return
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                send()
              }
              if (e.key === 'Escape') setMentionOpen(false)
            }}
            disabled={inputBlocked}
          />
        </div>
        <div className="lex-chatActions">
          <button className="lex-btn lex-btn--primary" type="button" onClick={send} disabled={inputBlocked}>
            Send
          </button>
          <div className="lex-hint">Ctrl/⌘ + Enter</div>
        </div>
      </div>
    </div>
  )
}

export const ChatPanel = forwardRef(ChatPanelImpl)

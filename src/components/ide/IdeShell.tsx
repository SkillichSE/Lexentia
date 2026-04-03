import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatPanel, type ChatAttachment, type ChatMessage, type ChatPanelRef } from './ChatPanel'
import type { ChatPlanBlock } from './chatPlanTypes'
import { MenuBar, type MenuAction } from './MenuBar'
import { PrivacyTopBar } from './PrivacyTopBar'
import { FileTabIcon } from './FileTabIcon'
import { EditorPanel } from './EditorPanel'
import { LogsPanel } from './LogsPanel'
import { NotificationProvider } from './NotificationContext'
import { ModelService } from '../../services/modelService'
import { ToolsClient } from '../../tools/ToolsClient'
import { downloadText, HistoryService } from '../../services/historyService'
import { FileExplorerPanel } from './FileExplorerPanel'
import { TerminalPanel } from './TerminalPanel'
import { loadProfiles, saveProfiles, setActiveProfile, upsertProfile, type ModelProfile } from '../../services/modelProfiles'
import { ActivityBar } from './ActivityBar'
import { SettingsView } from './SettingsView'
import { OnboardingOverlay } from './OnboardingOverlay'
import { FilesPanel, type PendingFile } from './FilesPanel'
import { GitPanel } from './GitPanel'
import { loadSettings, saveSettings } from '../../services/settingsService'
import { loadWorkbenchState, saveWorkbenchState, type ActivityView, type BottomTab } from '../../state/workbenchState'
import { StatusBar, type StatusPaletteKind } from './StatusBar'
import { createPrivacyLog, type PrivacyEntry } from '../../services/privacyLog'
import type { IndexState } from '../../services/workspaceIndex'
import { scanWorkspace } from '../../services/workspaceIndex'
import { autoEditorContext, expandMentions } from '../../services/chatContext'
import { clipPromptBody, resolvePromptBudget, truncateWithNote, type PromptBudget } from '../../services/promptBudget'
import { streamCode } from '../../services/streamingOutput'
import { cleanOutput, parseDiff } from '../../services/postProcessor'
import { fileOperationManager, globalUndoHistory, useUndoHistory } from '../../services/undoHistory'

type ChatTab = { id: string; title: string; messages: ChatMessage[] }

function filePathBreadcrumb(relPath: string | null): string {
  if (!relPath) return ''
  return relPath.split(/[/\\]/).filter(Boolean).join(' > ')
}

function toModelHistory(msgs: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return msgs
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

function statusLanguageLabel(relPath: string | null, override: string | null): string {
  if (override) return override
  if (!relPath) return 'Plain text'
  const n = relPath.toLowerCase()
  if (n.endsWith('.json')) return 'JSON'
  if (n.endsWith('.ts') || n.endsWith('.tsx')) return 'TypeScript'
  if (n.endsWith('.js') || n.endsWith('.jsx')) return 'JavaScript'
  if (n.endsWith('.py')) return 'Python'
  if (n.endsWith('.md')) return 'Markdown'
  if (n.endsWith('.css')) return 'CSS'
  if (n.endsWith('.html')) return 'HTML'
  return 'Plain text'
}

function serializeAttachmentsForModel(atts: ChatAttachment[], maxBlockChars: number): string {
  const rough = atts.reduce((n, a) => n + (a.textPreview?.length ?? a.dataUrl?.length ?? 80), 0)
  const per = Math.max(400, Math.floor(maxBlockChars / Math.max(1, atts.length)))
  const cap = rough <= maxBlockChars ? 100_000 : per
  const parts: string[] = []
  for (const a of atts) {
    if (a.textPreview) {
      const t = a.textPreview.length > cap ? `${a.textPreview.slice(0, cap)}\n[truncated]` : a.textPreview
      parts.push(`### ${a.name}\n${t}`)
    } else if (a.dataUrl) {
      const d = a.dataUrl.length > cap ? `${a.dataUrl.slice(0, cap)}\n[truncated]` : a.dataUrl
      parts.push(`### ${a.name} (${a.mime})\n${d}`)
    } else parts.push(`### ${a.name}`)
  }
  let out = parts.join('\n\n')
  if (out.length > maxBlockChars) out = `${out.slice(0, maxBlockChars)}\n\n[ATTACHMENTS: truncated to budget]`
  return out
}

export function IdeShell() {
  const [workbench, setWorkbench] = useState(() => loadWorkbenchState())
  const [settings, setSettings] = useState(() => loadSettings())
  const [profilesState, setProfilesState] = useState(() => loadProfiles())
  const activeProfile = profilesState.profiles.find((p) => p.id === profilesState.activeProfileId) as ModelProfile
  const promptBudget: PromptBudget = useMemo(
    () => resolvePromptBudget(settings.promptBudgetMode, activeProfile.model),
    [settings.promptBudgetMode, activeProfile.model],
  )
  const modelOpts = useMemo(
    () => ({
      temperature: settings.temperature,
      topP: settings.topP,
      compactSystem: promptBudget.shortSystemPrompt,
    }),
    [settings.temperature, settings.topP, promptBudget.shortSystemPrompt],
  )
  const [connectedProfileId, setConnectedProfileId] = useState<string | null>(null)
  const modelService = useMemo(() => new ModelService(), [])
  const toolsClient = useMemo(() => new ToolsClient(settings.toolsBaseUrl), [settings.toolsBaseUrl])
  const historyService = useMemo(() => new HistoryService(), [])
  const [chatTabs, setChatTabs] = useState<ChatTab[]>(() => {
    const now = Date.now()
    return [
      {
        id: 'main',
        title: 'Chat',
        messages: [
          {
            id: `m-${now}-assistant`,
            role: 'assistant',
            content: 'Welcome! Connect a model in Settings and describe your task.',
            createdAt: now,
          },
        ],
      },
    ]
  })
  const [activeChatId, setActiveChatId] = useState('main')
  const activeMessages = useMemo(() => chatTabs.find((t) => t.id === activeChatId)?.messages ?? [], [chatTabs, activeChatId])

  const patchTabMessages = (tabId: string, fn: (msgs: ChatMessage[]) => ChatMessage[]) => {
    setChatTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, messages: fn(t.messages) } : t)))
  }
  const attachDiffChanges = (tabId: string, assistantId: string, rawContent: string) => {
    const normalized = cleanOutput(rawContent)
    const parsed = parseDiff(normalized)
    if (!parsed.length) return
    patchTabMessages(tabId, (msgs) =>
      msgs.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              changes: parsed.map((c, idx) => ({
                id: `${assistantId}-chg-${idx}`,
                filePath: c.path,
                oldContent: c.original,
                newContent: c.modified,
                type: c.type,
              })),
            }
          : m,
      ),
    )
  }

  const [logs, setLogs] = useState<string[]>(['Lexentia: workbench started'])
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const extractedTextRef = useRef<string | null>(null)
  const [stagedFiles, setStagedFiles] = useState<PendingFile[]>([])
  const [session] = useState(() => historyService.createSession(undefined))
  const [clarification, setClarification] = useState<{ question: string; options: string[] } | null>(null)
  const [tabs, setTabs] = useState<{ relPath: string; name: string; content: string; isDirty: boolean }[]>([])
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null)
  const chatPanelRef = useRef<ChatPanelRef>(null)
  const [cursor, setCursor] = useState({ line: 1, col: 1 })
  const [expandedOutline, setExpandedOutline] = useState(false)
  const [expandedTimeline, setExpandedTimeline] = useState(false)

  const callWindowApi = async (action: 'minimize' | 'toggleMaximize' | 'close' | 'isMaximized') => {
    if (!window.lexentia?.window || typeof (window.lexentia.window as any)[action] !== 'function') {
      console.warn(`[Lexentia] window API not available: ${action}`)
      return { ok: false, isMaximized: false }
    }
    try {
      return await (window.lexentia.window as any)[action]()
    } catch (error) {
      console.error('[Lexentia] window action failed:', action, error)
      return { ok: false, isMaximized: false }
    }
  }
  const [paletteKind, setPaletteKind] = useState<StatusPaletteKind>(null)
  const [encoding, setEncoding] = useState('UTF-8')
  const [languageOverride, setLanguageOverride] = useState<string | null>(null)
  const undo = useUndoHistory(globalUndoHistory)
  const privacyLogRef = useRef(createPrivacyLog())
  const [privacyEntries, setPrivacyEntries] = useState<PrivacyEntry[]>([])
  const [indexState, setIndexState] = useState<IndexState>({
    status: 'idle',
    fileCount: 0,
    chunkEstimate: 0,
    progress: 0,
  })
  const [indexedFiles, setIndexedFiles] = useState<string[]>([])
  const snippetMapRef = useRef<Map<string, string>>(new Map())

  const logPrivacy = (e: Omit<PrivacyEntry, 'id' | 'at'>) => {
    setPrivacyEntries(privacyLogRef.current.push(e))
  }

  useEffect(() => {
    setLanguageOverride(null)
  }, [activeRelPath])

  useEffect(() => {
    if (!workspaceRoot) {
      setIndexState({ status: 'idle', fileCount: 0, chunkEstimate: 0, progress: 0 })
      setIndexedFiles([])
      snippetMapRef.current = new Map()
      return
    }
    let cancelled = false
    ;(async () => {
      logPrivacy({
        kind: 'indexing',
        title: 'Workspace scan started (local)',
        detail: workspaceRoot,
      })
      const { files, chunks } = await scanWorkspace((st) => {
        if (!cancelled) setIndexState(st)
      })
      if (cancelled) return
      setIndexedFiles(files)
      const map = new Map<string, string>()
      for (const f of files.slice(0, 100)) {
        const r = await window.lexentia.fs.readFile(f)
        if (r.ok && r.content != null) map.set(f, r.content.slice(0, 60_000))
      }
      snippetMapRef.current = map
      logPrivacy({
        kind: 'indexing',
        title: `Indexed ${files.length} files (~${chunks} chunk est.)`,
        detail: 'vector index not wired; @codebase uses local keyword scan',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [workspaceRoot])

  useEffect(() => {
    ;(async () => {
      const res = await callWindowApi('isMaximized')
      if (res.ok) setIsMaximized(res.isMaximized)
    })()
  }, [])

  useEffect(() => {
    saveWorkbenchState(workbench)
  }, [workbench])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    extractedTextRef.current = extractedText
  }, [extractedText])

  const statusLine = useMemo(() => {
    if (!connectedProfileId) return 'Model not connected'
    const p = profilesState.profiles.find((x) => x.id === connectedProfileId)
    return p ? `Model: ${p.name}` : 'Model not connected'
  }, [connectedProfileId, profilesState.profiles])

  const activeFile = activeRelPath ? tabs.find((t) => t.relPath === activeRelPath) ?? null : null
  const secondaryFile = useMemo(() => {
    if (!workbench.editorSplit || !workbench.secondaryRelPath) return null
    return tabs.find((t) => t.relPath === workbench.secondaryRelPath) ?? null
  }, [tabs, workbench.editorSplit, workbench.secondaryRelPath])

  const addLog = (line: string) => {
    setLogs((prev) => {
      const next = [...prev, line]
      return next.length > 500 ? next.slice(next.length - 500) : next
    })
  }

  const onConnectModel = () => {
    setConnectedProfileId(activeProfile.id)
    addLog(`Model profile: ${activeProfile.name}`)
  }

  const exportHistory = () => {
    const json = historyService.exportSession(session.id)
    downloadText(`lexentia-history-${session.id}.json`, json, 'application/json')
    addLog('History exported.')
  }

  const clearHistory = () => {
    historyService.clearAll()
    addLog('History cleared.')
    window.location.reload()
  }

  const applyExtractedContext = (baseText: string) => {
    const ctx = extractedTextRef.current
    if (!ctx) return baseText
    const { text, note } = truncateWithNote(ctx, promptBudget.maxExtractedChars, 'Extracted files')
    if (note) {
      logPrivacy({
        kind: 'note',
        title: 'Prompt budget',
        detail: 'Extracted text truncated to model limit.',
      })
    }
    return `${baseText}\n\n[EXTRACTED_FILES_TEXT]\n${text}`.trim()
  }

  const updateActivityView = (view: ActivityView) => {
    setWorkbench((prev) => ({ ...prev, activityView: view }))
  }
  const updateBottomTab = (tab: BottomTab) => setWorkbench((prev) => ({ ...prev, bottomVisible: true, bottomTab: tab }))

  const openFile = async (relPath: string) => {
    const already = tabs.find((t) => t.relPath === relPath)
    if (already) {
      setActiveRelPath(relPath)
      return
    }
    const res = await window.lexentia.fs.readFile(relPath)
    if (!res.ok) return addLog(`Failed to open file: ${relPath}`)
    setTabs((prev) => [...prev, { relPath, name: relPath.split('/').pop() || relPath, content: res.content ?? '', isDirty: false }])
    setActiveRelPath(relPath)
    setWorkbench((prev) => ({ ...prev, activityView: 'explorer' }))
    addLog(`Opened: ${relPath}`)
  }

  const openFileInCurrentTab = async (relPath: string) => {
    const fileName = relPath.split('/').pop() || relPath
    const res = await window.lexentia.fs.readFile(relPath)
    if (!res.ok) return addLog(`Failed to open file: ${relPath}`)
    
    // If no tabs exist, create first tab
    if (tabs.length === 0) {
      setTabs([{ relPath, name: fileName, content: res.content ?? '', isDirty: false }])
      setActiveRelPath(relPath)
    } else {
      // Replace current active tab content
      setTabs((prev) =>
        prev.map((t) =>
          t.relPath === activeRelPath
            ? { relPath, name: fileName, content: res.content ?? '', isDirty: false }
            : t
        )
      )
      setActiveRelPath(relPath)
    }
    setWorkbench((prev) => ({ ...prev, activityView: 'explorer' }))
    addLog(`Opened: ${relPath}`)
  }

  const openFileInNewTab = async (relPath: string) => {
    const res = await window.lexentia.fs.readFile(relPath)
    if (!res.ok) return addLog(`Failed to open file: ${relPath}`)
    const fileName = relPath.split('/').pop() || relPath
    setTabs((prev) => [...prev, { relPath, name: fileName, content: res.content ?? '', isDirty: false }])
    setActiveRelPath(relPath)
    setWorkbench((prev) => ({ ...prev, activityView: 'explorer' }))
    addLog(`Opened in new tab: ${relPath}`)
  }

  const saveActive = async () => {
    const rel = activeRelPath
    if (!rel) return
    const tab = tabs.find((t) => t.relPath === rel)
    if (!tab) return
    await window.lexentia.fs.writeFile(rel, tab.content)
    setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, isDirty: false } : t)))
    addLog(`Saved: ${rel}`)
  }

  const saveSecondary = async () => {
    const rel = workbench.secondaryRelPath
    if (!rel) return
    const tab = tabs.find((t) => t.relPath === rel)
    if (!tab) return
    await window.lexentia.fs.writeFile(rel, tab.content)
    setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, isDirty: false } : t)))
    addLog(`Saved: ${rel}`)
  }

  const closeTab = (relPath: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.relPath !== relPath)
      setActiveRelPath((active) => {
        if (active !== relPath) return active
        return next.length ? next[next.length - 1].relPath : null
      })
      return next
    })
    setWorkbench((p) => (p.secondaryRelPath === relPath ? { ...p, secondaryRelPath: null, editorSplit: false } : p))
  }

  const toggleEditorSplit = () => {
    setWorkbench((prev) => {
      if (prev.editorSplit) return { ...prev, editorSplit: false, secondaryRelPath: null }
      const other = tabs.find((t) => t.relPath !== activeRelPath)?.relPath ?? null
      return { ...prev, editorSplit: Boolean(other), secondaryRelPath: other }
    })
  }

  const handleMenuAction = (action: MenuAction) => {
    switch (action) {
      case 'file.openFolder':
        void (async () => {
          try {
            const res = await window.lexentia.workspace.openFolder()
            if (res.ok && res.workspaceRoot) setWorkspaceRoot(res.workspaceRoot)
            else addLog('Failed to open folder (API unavailable).')
          } catch (e) {
            console.warn('file.openFolder failed', e)
            addLog('Failed to open folder (API unavailable).')
          }
        })()
        break
      case 'file.save':
        void (async () => {
          try {
            await saveActive()
          } catch (e) {
            console.warn('file.save failed', e)
            addLog('Save failed (API unavailable).')
          }
        })()
        break
      case 'file.reload':
        window.location.reload()
        break
      case 'edit.copy':
        chatInputRef.current?.focus()
        document.execCommand('copy')
        break
      case 'edit.paste':
        chatInputRef.current?.focus()
        addLog('Paste: use Ctrl+V in the chat field.')
        break
      case 'edit.find':
        chatInputRef.current?.focus()
        break
      case 'selection.selectAll':
        chatInputRef.current?.select()
        break
      case 'view.toggleExplorer':
        updateActivityView('explorer')
        break
      case 'view.toggleSearch':
        updateActivityView('search')
        break
      case 'view.togglePanel':
        setWorkbench((p) => ({ ...p, bottomVisible: false }))
        break
      case 'go.line': {
        const raw = window.prompt('Go to line:', String(cursor.line))
        if (raw != null) addLog(`Go to line: ${raw} (editor focus — in future versions)`)
        break
      }
      case 'terminal.new':
        setWorkbench((p) => ({ ...p, bottomVisible: false, bottomTab: 'logs' }))
        break
      case 'help.about':
        alert('Lexentia — local IDE with chat and terminal.')
        break
      default:
        break
    }
  }

  const newChatTab = () => {
    const id = `t-${Date.now()}`
    const now = Date.now()
    setChatTabs((prev) => [
      ...prev,
      {
        id,
        title: `Chat ${prev.length + 1}`,
        messages: [
          {
            id: `m-${now}-a`,
            role: 'assistant',
            content: 'New chat. Describe the task or attach files using the "+" button.',
            createdAt: now,
          },
        ],
      },
    ])
    setActiveChatId(id)
  }

  const applyPlanAssistantMessage = (
    tabId: string,
    assistantId: string,
    result: { title?: string; introduction?: string; steps: string[] },
    now: number,
  ) => {
    const intro = result.introduction || 'Plan proposed. Confirm (Allow) or reject (Reject).'
    patchTabMessages(tabId, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              content: intro,
              plan: {
                title: result.title,
                introduction: result.introduction,
                steps: result.steps.map((text, i) => ({ id: `s-${assistantId}-${i}`, text, status: 'pending' as const })),
                approval: 'pending',
              },
            }
          : m,
      ),
    )
    historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: intro, createdAt: now + 1 }, activeProfile.model)
  }

  const runPlanExecution = async (tabId: string, planMessageId: string, plan: ChatPlanBlock, baseMessages: ChatMessage[]) => {
    if (!connectedProfileId) return
    let apiHistory = toModelHistory(baseMessages)
    const fullPlanText = plan.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')

    for (let i = 0; i < plan.steps.length; i++) {
      const execPrompt = `[PLAN EXECUTION — APPROVED]\nThe user approved the plan. Execute ONLY step ${i + 1} of ${plan.steps.length} in this response. Do not complete other steps in this turn.\n\nCurrent step: ${plan.steps[i].text}\n\nFull plan:\n${fullPlanText}\n\n${plan.introduction ? `Context: ${plan.introduction}` : ''}`

      try {
        logPrivacy({
          kind: 'model_outbound',
          title: `Plan step ${i + 1}/${plan.steps.length}`,
          detail: activeProfile.baseUrl,
        })
        const execClipped = clipPromptBody(execPrompt, promptBudget.maxTotalChars).text
        const result = await modelService.next([...apiHistory, { role: 'user', content: execClipped }], activeProfile, modelOpts)
        if (result.type === 'clarify') {
          setClarification({ question: result.question, options: result.options })
          patchTabMessages(tabId, (prev) =>
            prev.map((m) => (m.id === planMessageId && m.plan ? { ...m, plan: { ...m.plan, executing: false } } : m)),
          )
          return
        }
        if (result.type === 'plan') {
          patchTabMessages(tabId, (prev) => {
            const marked = prev.map((m) =>
              m.id === planMessageId && m.plan
                ? {
                    ...m,
                    plan: {
                      ...m.plan,
                      steps: m.plan.steps.map((s, j) => (j === i ? { ...s, done: true } : s)),
                      executing: false,
                    },
                  }
                : m,
            )
            const note: ChatMessage = {
              id: `m-${Date.now()}-warn`,
              role: 'assistant',
              content: 'Plan execution interrupted: model returned new plan.',
              createdAt: Date.now(),
            }
            return [...marked, note]
          })
          return
        }
        const stepContent = result.content
        apiHistory = [...apiHistory, { role: 'user', content: execClipped }, { role: 'assistant', content: stepContent }]
        const stepMsg: ChatMessage = {
          id: `m-${Date.now()}-step-${i}`,
          role: 'assistant',
          content: `**Step ${i + 1}/${plan.steps.length}**\n\n${stepContent}`,
          createdAt: Date.now(),
        }
        patchTabMessages(tabId, (prev) => {
          const marked = prev.map((m) =>
            m.id === planMessageId && m.plan
              ? {
                  ...m,
                  plan: {
                    ...m.plan,
                    steps: m.plan.steps.map((s, j) => (j === i ? { ...s, done: true } : s)),
                  },
                }
              : m,
          )
          return [...marked, stepMsg]
        })
        historyService.addMessage(session.id, stepMsg, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        patchTabMessages(tabId, (prev) =>
          prev
            .map((m) =>
              m.id === planMessageId && m.plan ? { ...m, plan: { ...m.plan, executing: false } } : m,
            )
            .concat([
              { id: `m-${Date.now()}-err`, role: 'assistant', content: `Step ${i + 1} error: ${msg}`, createdAt: Date.now() },
            ]),
        )
        return
      }
    }

    patchTabMessages(tabId, (prev) =>
      prev.map((m) =>
        m.id === planMessageId && m.plan ? { ...m, plan: { ...m.plan, executing: false } } : m,
      ),
    )
  }

  const handlePlanReject = (messageId: string) => {
    const tabId = activeChatId
    patchTabMessages(tabId, (prev) =>
      prev.map((m) =>
        m.id === messageId && m.plan
          ? {
              ...m,
              plan: { ...m.plan, approval: 'rejected', executing: false },
              content: `${m.content}\n\nPlan rejected.`,
            }
          : m,
      ),
    )
  }

  const handlePlanAllow = (messageId: string) => {
    const tabId = activeChatId
    const tab = chatTabs.find((t) => t.id === tabId)
    if (!tab) return
    const planMsg = tab.messages.find((m) => m.id === messageId)
    if (!planMsg?.plan || planMsg.plan.approval !== 'pending') return
    const snapshot = tab.messages
    patchTabMessages(tabId, (prev) =>
      prev.map((m) =>
        m.id === messageId && m.plan ? { ...m, plan: { ...m.plan, approval: 'accepted', executing: true } } : m,
      ),
    )
    void runPlanExecution(tabId, messageId, planMsg.plan, snapshot)
  }

  const onClarificationSelect = (option: string) => {
    if (!connectedProfileId) return setClarification(null)
    const now = Date.now()
    const tabId = activeChatId
    const priorBefore = chatTabs.find((t) => t.id === tabId)?.messages ?? []
    setClarification(null)
    const userMsg: ChatMessage = { id: `m-${now}-user`, role: 'user', content: option, createdAt: now }
    const assistantId = `m-${now}-assistant`
    patchTabMessages(tabId, (prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: 'Thinking…', createdAt: now + 1 }])
    historyService.addMessage(session.id, userMsg, activeProfile.model)
    ;(async () => {
      try {
        const history = toModelHistory([...priorBefore, userMsg])
        const result = await modelService.next([...history, { role: 'user', content: applyExtractedContext(option) }], activeProfile, modelOpts)
        if (result.type === 'clarify') {
          const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
          setClarification({ question: result.question, options: result.options })
          patchTabMessages(tabId, (msgs) => msgs.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
          return
        }
        if (result.type === 'plan') {
          applyPlanAssistantMessage(tabId, assistantId, result, now)
          return
        }
        let streamedContent = ''
        await streamCode(result.content, (currentText) => {
          streamedContent = currentText
          patchTabMessages(tabId, (msgs) => msgs.map((m) => (m.id === assistantId ? { ...m, content: streamedContent } : m)))
        })
        attachDiffChanges(tabId, assistantId, result.content)
        historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: result.content, createdAt: now + 1 }, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        patchTabMessages(tabId, (msgs) => msgs.map((m) => (m.id === assistantId ? { ...m, content: `Model request failed: ${msg}` } : m)))
      }
    })()
  }

  const onAttachToChat = async (relPath: string) => {
    try {
      const res = await window.lexentia.fs.readFile(relPath)
      if (!res.ok) {
        addLog(`Failed to read file for attachment: ${relPath}`)
        return
      }
      
      const fileName = relPath.split('/').pop() || relPath
      const mimeType = getMimeType(fileName)
      const attachment: ChatAttachment = {
        id: `a-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: fileName,
        mime: mimeType,
        textPreview: res.content,
      }
      
      chatPanelRef.current?.addAttachment(attachment)
      addLog(`Attached file to chat: ${relPath}`)
    } catch (error) {
      addLog(`Error attaching file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const getMimeType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const types: Record<string, string> = {
      'ts': 'text/typescript',
      'tsx': 'text/typescript',
      'js': 'text/javascript',
      'jsx': 'text/javascript',
      'py': 'text/python',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
    }
    return types[ext] || 'text/plain'
  }

  const onSendChat = (text: string, options?: { attachments?: ChatAttachment[] }) => {
    const trimmed = text.trim()
    const attachments = options?.attachments
    if (!trimmed && !attachments?.length) return
    const tabId = activeChatId
    const priorMessages = chatTabs.find((t) => t.id === tabId)?.messages ?? []
    const now = Date.now()
    const displayContent = trimmed || (attachments?.length ? `[${attachments.length} attachment(s)]` : '')
    const userMsg: ChatMessage = {
      id: `m-${now}-user`,
      role: 'user',
      content: displayContent,
      createdAt: now,
      attachments: attachments?.length ? attachments : undefined,
    }
    const assistantId = `m-${now}-assistant`
    const sysId = `m-${now}-sys`
    const autoCtx = autoEditorContext({
      openTabPaths: tabs.map((t) => t.relPath),
      activeRelPath,
      cursor,
    })
    const expandSource = trimmed || (attachments?.length ? `@attachments ${attachments.map((a) => a.name).join(' ')}` : '')
    const { augmented, notes } = expandMentions(expandSource, {
      indexedFiles,
      snippets: snippetMapRef.current,
      workspaceRoot,
      maxCodebaseHits: promptBudget.maxCodebaseHits,
    })
    const attachBlock = attachments?.length
      ? `\n\n[ATTACHMENTS]\n${serializeAttachmentsForModel(attachments, promptBudget.maxAttachmentBlockChars)}`
      : ''
    const privacyDetail = `${activeProfile.provider} ${activeProfile.baseUrl} (api key not stored in log)`
    logPrivacy({
      kind: 'model_outbound',
      title: 'Chat prompt sent',
      detail: privacyDetail,
    })
    if (notes.length) {
      notes.forEach((n) =>
        logPrivacy({
          kind: 'note',
          title: 'Context note',
          detail: n,
        }),
      )
    }
    if (attachments?.length) {
      logPrivacy({
        kind: 'file_scope',
        title: 'Chat attachments',
        detail: attachments.map((a) => a.name).join(', '),
      })
    }
    const systemLine = `Privacy: request goes to your configured endpoint only. ${notes.length ? notes.join(' ') : ''} Prompt budget: ${promptBudget.label}.`
    patchTabMessages(tabId, (prev) => [
      ...prev,
      userMsg,
      { id: sysId, role: 'system', content: systemLine, createdAt: now },
      { id: assistantId, role: 'assistant', content: 'Thinking…', createdAt: now + 1 },
    ])
    historyService.addMessage(session.id, userMsg, activeProfile.model)

    setExtractedText(null)
    extractedTextRef.current = null

    ;(async () => {
      if (!connectedProfileId) {
        patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: 'Connect a model first in Settings (Connect).' } : m)))
        return
      }
      try {
        const filesToExtract = stagedFiles.map((f) => f.file).filter(Boolean) as File[]
        if (filesToExtract.length) {
          logPrivacy({ kind: 'local_tools', title: 'Local tool extract', detail: `${filesToExtract.length} file(s) read on disk` })
          const parts: string[] = []
          for (const f of filesToExtract) {
            const res = await toolsClient.extractByExtension(f)
            parts.push(`FILE: ${f.name}\n-----\n${res.text}`)
            if (Array.isArray(res.warnings) && res.warnings.length) {
              res.warnings.forEach((w) => addLog(`Tools warning (${f.name}): ${w}`))
            }
          }
          const combinedRaw = parts.join('\n\n')
          const extClip = truncateWithNote(combinedRaw, promptBudget.maxExtractedChars, 'Extracted files')
          if (extClip.note) {
            logPrivacy({
              kind: 'note',
              title: 'Prompt budget',
              detail: 'Extracted text truncated to model limit.',
            })
          }
          setExtractedText(extClip.text)
          extractedTextRef.current = extClip.text
          const history = toModelHistory([...priorMessages, userMsg])
          let userText = `${autoCtx}\n${augmented}${attachBlock}\n\n${trimmed}\n\n[EXTRACTED_FILES_TEXT]\n${extClip.text}`.trim()
          const totalClip = clipPromptBody(userText, promptBudget.maxTotalChars)
          if (totalClip.note) {
            logPrivacy({
              kind: 'note',
              title: 'Prompt budget',
              detail: 'Total user prompt truncated to model limit.',
            })
          }
          userText = totalClip.text
          const result = await modelService.next([...history, { role: 'user', content: userText }], activeProfile, modelOpts)
          if (result.type === 'clarify') {
            const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
            setClarification({ question: result.question, options: result.options })
            patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
            historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
            return
          }
          if (result.type === 'plan') {
            applyPlanAssistantMessage(tabId, assistantId, result, now)
            return
          }
          let streamedContent = ''
          await streamCode(result.content, (currentText) => {
            streamedContent = currentText
            patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: streamedContent } : m)))
          })
          attachDiffChanges(tabId, assistantId, result.content)
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: result.content, createdAt: now + 1 }, activeProfile.model)
          return
        }

        const history = toModelHistory([...priorMessages, userMsg])
        let body = `${autoCtx}\n${augmented}${attachBlock}`.trim()
        const bodyClip = clipPromptBody(body, promptBudget.maxTotalChars)
        if (bodyClip.note) {
          logPrivacy({
            kind: 'note',
            title: 'Prompt budget',
            detail: 'Message context truncated to model limit.',
          })
        }
        body = bodyClip.text
        const result = await modelService.next([...history, { role: 'user', content: body }], activeProfile, modelOpts)
        if (result.type === 'clarify') {
          const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
          setClarification({ question: result.question, options: result.options })
          patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
          return
        }
        if (result.type === 'plan') {
          setClarification(null)
          applyPlanAssistantMessage(tabId, assistantId, result, now)
          return
        }
        setClarification(null)
        let streamedContent = ''
        await streamCode(result.content, (currentText) => {
          streamedContent = currentText
          patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: streamedContent } : m)))
        })
        attachDiffChanges(tabId, assistantId, result.content)
        historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: result.content, createdAt: now + 1 }, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Model request failed: ${msg}` } : m)))
      }
    })()
  }

  const openLineChatSession = (kind: 'explain' | 'fix', line: number, relPathOverride?: string | null) => {
    const rel = relPathOverride ?? activeRelPath
    const fileTab = rel ? tabs.find((t) => t.relPath === rel) : null
    if (!rel || !fileTab) return
    const tabId = `line-${Date.now()}`
    const shortName = rel.split(/[/\\]/).pop() ?? rel
    const title = kind === 'explain' ? `Explain L${line}` : `Fix L${line}`
    const now = Date.now()
    const shortLabel = kind === 'explain' ? `Explain line ${line} — ${shortName}` : `Fix line ${line} — ${shortName}`
    const userMsg: ChatMessage = { id: `m-${now}-user`, role: 'user', content: shortLabel, createdAt: now }
    const assistantId = `m-${now}-assistant`
    const sysId = `m-${now}-sys`
    const autoCtx = autoEditorContext({
      openTabPaths: tabs.map((t) => t.relPath),
      activeRelPath: rel,
      cursor: { line, col: 1 },
    })
    const maxFile = promptBudget.maxLineChatFileChars
    const rawContent = fileTab.content
    const fileBody =
      rawContent.length > maxFile
        ? `${rawContent.slice(0, maxFile)}\n\n[... truncated ${rawContent.length - maxFile} chars — prompt budget]`
        : rawContent
    if (rawContent.length > maxFile) {
      logPrivacy({
        kind: 'note',
        title: 'Prompt budget',
        detail: `File for Explain/Fix truncated to ${maxFile} chars.`,
      })
    }
    const fileBlock = `[FULL FILE: ${rel}]\n\`\`\`\n${fileBody}\n\`\`\`\n`
    const lineText = fileTab.content.split('\n')[line - 1] ?? ''
    const focusLine = `Line ${line} (focus):\n${lineText}`
    const core =
      kind === 'explain'
        ? `${shortLabel}\n\nExplain this line in the context of the entire file above. Be concise.\n\n${focusLine}\n\n${fileBlock}`
        : `${shortLabel}\n\nThe editor has a diagnostic (error or warning) on this line. First explain what is wrong and why, then give a corrected line or minimal fix.\n\n${focusLine}\n\n${fileBlock}`
    const { augmented, notes } = expandMentions(core, {
      indexedFiles,
      snippets: snippetMapRef.current,
      workspaceRoot,
      maxCodebaseHits: promptBudget.maxCodebaseHits,
    })
    const privacyDetail = `${activeProfile.provider} ${activeProfile.baseUrl} (api key not stored in log)`
    logPrivacy({
      kind: 'model_outbound',
      title: kind === 'explain' ? 'Editor: explain line' : 'Editor: fix line',
      detail: privacyDetail,
    })
    if (notes.length) {
      notes.forEach((n) => logPrivacy({ kind: 'note', title: 'Context note', detail: n }))
    }
    const systemLine = `Privacy: request goes to your configured endpoint only. ${notes.length ? notes.join(' ') : ''} Prompt budget: ${promptBudget.label}.`
    setChatTabs((prev) => [
      ...prev,
      {
        id: tabId,
        title: `${title} · ${shortName}`,
        messages: [
          userMsg,
          { id: sysId, role: 'system', content: systemLine, createdAt: now },
          { id: assistantId, role: 'assistant', content: 'Thinking…', createdAt: now + 1 },
        ],
      },
    ])
    setActiveChatId(tabId)
    historyService.addMessage(session.id, userMsg, activeProfile.model)

    void (async () => {
      if (!connectedProfileId) {
        patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: 'Connect a model first in Settings (Connect).' } : m)))
        return
      }
      try {
        const history = toModelHistory([userMsg])
        let body = `${autoCtx}\n${augmented}`.trim()
        const lineClip = clipPromptBody(body, promptBudget.maxTotalChars)
        if (lineClip.note) {
          logPrivacy({
            kind: 'note',
            title: 'Prompt budget',
            detail: 'Explain/Fix: context truncated to model limit.',
          })
        }
        body = lineClip.text
        const result = await modelService.next([...history, { role: 'user', content: body }], activeProfile, modelOpts)
        if (result.type === 'clarify') {
          const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
          setClarification({ question: result.question, options: result.options })
          patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
          return
        }
        if (result.type === 'plan') {
          applyPlanAssistantMessage(tabId, assistantId, result, now)
          return
        }
        setClarification(null)
        let streamedContent = ''
        await streamCode(result.content, (currentText) => {
          streamedContent = currentText
          patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: streamedContent } : m)))
        })
        attachDiffChanges(tabId, assistantId, result.content)
        historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: result.content, createdAt: now + 1 }, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        patchTabMessages(tabId, (prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Model request failed: ${msg}` } : m)))
      }
    })()
  }

  const closeChatTab = (id: string) => {
    if (chatTabs.length <= 1) return
    const next = chatTabs.filter((t) => t.id !== id)
    setChatTabs(next)
    if (activeChatId === id) setActiveChatId(next[next.length - 1]!.id)
  }

  const hasSentMessage = chatTabs.some((t) => t.messages.some((m) => m.role === 'user'))

  const mentionCandidates = useMemo(() => {
    const s = new Set<string>()
    tabs.forEach((t) => s.add(t.relPath))
    indexedFiles.forEach((f) => s.add(f))
    return Array.from(s).sort()
  }, [tabs, indexedFiles])

  const tokenEstimate = useMemo(() => {
    const len = activeMessages.reduce((a, m) => a + m.content.length, 0)
    return `~${Math.ceil(len / 4)} tok est`
  }, [activeMessages])

  const modelLabel = useMemo(() => `${activeProfile.name} / ${activeProfile.model}`, [activeProfile])

  const indexLabel = useMemo(() => {
    if (!workspaceRoot) return 'index: off'
    if (indexState.status === 'scanning') return `index: ${indexState.progress}%`
    if (indexState.status === 'ready') return `index: ${indexState.fileCount} files`
    if (indexState.status === 'error') return 'index: err'
    return 'index: idle'
  }, [workspaceRoot, indexState])

  const handleInlineAi = async (args: { instruction: string; selection: string }) => {
    if (!connectedProfileId) return null
    logPrivacy({
      kind: 'model_outbound',
      title: 'inline edit (ctrl+k)',
      detail: `${activeProfile.baseUrl} — ${args.selection.length} chars`,
    })
    const rawPrompt = `Return ONLY replacement code. No markdown code fences.\n\nTask:\n${args.instruction}\n\nSelection:\n${args.selection || '(empty)'}`
    const prompt = clipPromptBody(rawPrompt, promptBudget.maxInlineChars).text
    try {
      const result = await modelService.next([{ role: 'user', content: prompt }], activeProfile, modelOpts)
      if (result.type === 'clarify') return null
      if (result.type === 'plan') return null
      return result.content
        .replace(/^```[\w]*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
    } catch {
      return null
    }
  }

  const handleDiffApply = async (messageId: string, changeId: string) => {
    const msg = activeMessages.find((m) => m.id === messageId)
    const change = msg?.changes?.find((c) => c.id === changeId)
    if (!change) return
    try {
      await fileOperationManager.applyChanges(
        [
          {
            filePath: change.filePath,
            oldContent: change.oldContent,
            newContent: change.newContent,
            type: change.type,
          },
        ],
        { sessionId: session.id, model: activeProfile.model },
      )
      patchTabMessages(activeChatId, (prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, changes: (m.changes ?? []).filter((c) => c.id !== changeId) } : m,
        ),
      )
      addLog(`Applied change: ${change.filePath}`)
    } catch (e) {
      addLog(`Apply failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleDiffCancel = (messageId: string, changeId: string) => {
    patchTabMessages(activeChatId, (prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, changes: (m.changes ?? []).filter((c) => c.id !== changeId) } : m,
      ),
    )
  }

  const handleUndo = async () => {
    const current = globalUndoHistory.getCurrentRecord()
    if (!current) return
    try {
      await fileOperationManager.revertChanges(current)
      undo.undo()
      addLog('Undo applied.')
    } catch (e) {
      addLog(`Undo failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleRedo = async () => {
    const rec = undo.redo()
    if (!rec) return
    try {
      await fileOperationManager.revertChanges(rec)
      addLog('Redo applied.')
    } catch (e) {
      addLog(`Redo failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const sidebarHeader = (title: string) => <div className="lex-sidebarHeader">{title}</div>

  const placeholder = (title: string, hint: string) => (
    <div className="lex-sideSection">
      {sidebarHeader(title)}
      <p className="lex-subtle">{hint}</p>
    </div>
  )

  return (
    <NotificationProvider>
      <div className="lex-root">
        <div className="lex-topbar">
        <div className="lex-topbarLeft">
          <div className="lex-brand">Lexentia</div>
          <MenuBar onAction={handleMenuAction} />
        </div>
        <div className="lex-topbarCenter">
        </div>
        <div className="lex-topbarRight">
          <PrivacyTopBar entries={privacyEntries} />
          <div className="lex-windowControls">
            <button
              className="lex-windowBtn"
              type="button"
              onClick={async () => {
                const res = await callWindowApi('minimize')
                if (!res.ok) alert('Window control unavailable')
              }}
              title="Minimize"
            >
              &#8211;
            </button>
            <button
              className="lex-windowBtn"
              type="button"
              onClick={async () => {
                const res = await callWindowApi('toggleMaximize')
                if (!res.ok) {
                  alert('Window control unavailable')
                  return
                }
                setIsMaximized(res.isMaximized)
              }}
              title="Maximize"
            >
              {isMaximized ? '\u2750' : '\u25A1'}
            </button>
            <button
              className="lex-windowBtn lex-windowBtn--close"
              type="button"
              onClick={async () => {
                const res = await callWindowApi('close')
                if (!res.ok) alert('Window control unavailable')
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="lex-workbench">
        <ActivityBar active={workbench.activityView} onSelect={updateActivityView} />

        <aside className="lex-sidebar">
          {workbench.activityView === 'explorer' ? (
            <>
              {sidebarHeader('Explorer')}
              <FileExplorerPanel
                activeRelPath={activeRelPath}
                onOpenFile={openFileInCurrentTab}
                onOpenFileInNewTab={openFileInNewTab}
                onWorkspaceChanged={setWorkspaceRoot}
                controlledWorkspaceRoot={workspaceRoot}
                onAttachToChat={onAttachToChat}
              />
            </>
          ) : null}
          {workbench.activityView === 'search' ? (
            <div className="lex-sideSection">
              {sidebarHeader('Chat context')}
              <FilesPanel
                onChange={(next) => {
                  setStagedFiles(next)
                }}
              />
            </div>
          ) : null}
          {workbench.activityView === 'git' ? <GitPanel workspaceRoot={workspaceRoot} /> : null}
          {workbench.activityView === 'debug' ? placeholder('Run and debug', 'Debug configurations will appear here when available.') : null}
          {workbench.activityView === 'accounts' ? placeholder('Accounts', 'Sign-in is not configured in this build.') : null}
          {workbench.activityView === 'settings' ? (
            <>
              {sidebarHeader('Model configuration')}
              <SettingsView
                profilesState={profilesState}
                activeProfile={activeProfile}
                onActiveProfileIdChange={(id) => {
                  const next = setActiveProfile(profilesState, id)
                  setProfilesState(next)
                  saveProfiles(next)
                }}
                onModelNameChange={(v) => {
                  const next = upsertProfile(profilesState, { ...activeProfile, model: v })
                  setProfilesState(next)
                  saveProfiles(next)
                }}
                onBaseUrlChange={(v) => {
                  const next = upsertProfile(profilesState, { ...activeProfile, baseUrl: v })
                  setProfilesState(next)
                  saveProfiles(next)
                }}
                onApiKeyChange={
                  activeProfile.provider === 'openai_compatible'
                    ? (v) => {
                        const next = upsertProfile(profilesState, { ...activeProfile, apiKey: v || undefined })
                        setProfilesState(next)
                        saveProfiles(next)
                      }
                    : undefined
                }
                onConnectModel={onConnectModel}
                toolsBaseUrl={settings.toolsBaseUrl}
                onToolsBaseUrlChange={(v) => setSettings((p) => ({ ...p, toolsBaseUrl: v }))}
                temperature={settings.temperature}
                onTemperatureChange={(v) => setSettings((p) => ({ ...p, temperature: v }))}
                topP={settings.topP}
                onTopPChange={(v) => setSettings((p) => ({ ...p, topP: v }))}
                onExportHistory={exportHistory}
                onClearHistory={clearHistory}
                promptBudgetMode={settings.promptBudgetMode}
                onPromptBudgetModeChange={(mode) => setSettings((p) => ({ ...p, promptBudgetMode: mode }))}
              />
            </>
          ) : null}
          {workbench.activityView === 'explorer' ? (
            <>
              <button
                className="lex-sidebarHeader"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px 5px', textAlign: 'left', font: 'inherit' }}
                onClick={() => setExpandedOutline(!expandedOutline)}
              >
                {expandedOutline ? '▾' : '▸'} Outline
              </button>
              {expandedOutline ? (
                <div className="lex-sideSection">
                  <div className="lex-subtle">No symbols in the current file.</div>
                </div>
              ) : null}
              <button
                className="lex-sidebarHeader"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px 5px', textAlign: 'left', font: 'inherit' }}
                onClick={() => setExpandedTimeline(!expandedTimeline)}
              >
                {expandedTimeline ? '▾' : '▸'} Timeline
              </button>
              {expandedTimeline ? (
                <div className="lex-sideSection">
                  <div className="lex-subtle">No timeline events recorded.</div>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>

        <div className="lex-mainColumn">
          <main className="lex-main">
            <div className="lex-editorHost">
              <div className="lex-editorTabsRow">
                {tabs.length === 0 ? (
                  <div className="lex-tabEmpty" />
                ) : (
                  tabs.map((t) => (
                    <div
                      key={t.relPath}
                      role="tab"
                      tabIndex={0}
                      className={t.relPath === activeRelPath ? 'lex-editorTab lex-editorTab--active' : 'lex-editorTab'}
                      onClick={() => setActiveRelPath(t.relPath)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveRelPath(t.relPath)
                        }
                      }}
                    >
                      <FileTabIcon fileName={t.name} />
                      <span className="lex-editorTabLabel">
                        {t.name}
                        {t.isDirty ? ' •' : ''}
                      </span>
                      <button
                        type="button"
                        className="lex-tabClose"
                        aria-label="Close tab"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(t.relPath)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="lex-breadcrumbs" aria-label="File path">
                {filePathBreadcrumb(activeRelPath) || ''}
              </div>
              <div className={workbench.editorSplit ? 'lex-editorGroup lex-editorGroup--split' : 'lex-editorGroup'}>
                <div className="lex-editorPane">
                  <EditorPanel
                    extractedText={extractedText}
                    activeFile={activeFile}
                    onExplainLine={(line) => openLineChatSession('explain', line)}
                    onFixLine={(line) => openLineChatSession('fix', line)}
                    onChange={(content) => {
                      const rel = activeRelPath
                      if (!rel) return
                      setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, content, isDirty: true } : t)))
                    }}
                    onSave={saveActive}
                    onCursorPosition={(line, col) => setCursor({ line, col })}
                    onInlineAi={handleInlineAi}
                  />
                </div>
                {workbench.editorSplit ? (
                  <div className="lex-editorPane">
                    {secondaryFile ? (
                      <EditorPanel
                        activeFile={secondaryFile}
                        fileRelPath={workbench.secondaryRelPath}
                        onExplainLine={(line) => openLineChatSession('explain', line, workbench.secondaryRelPath)}
                        onFixLine={(line) => openLineChatSession('fix', line, workbench.secondaryRelPath)}
                        onChange={(content) => {
                          const rel = workbench.secondaryRelPath
                          if (!rel) return
                          setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, content, isDirty: true } : t)))
                        }}
                        onSave={saveSecondary}
                        onCursorPosition={(line, col) => setCursor({ line, col })}
                      />
                    ) : (
                      <div className="lex-editorPaneEmpty">Open another file to compare side by side.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </main>

          <section className={workbench.bottomVisible ? 'lex-bottomPanel' : 'lex-bottomPanel lex-bottomPanel--hidden'}>
            <div className="lex-bottomHeader">
              <div className="lex-modeSwitch lex-modeSwitch--two">
                <button type="button" className={workbench.bottomTab === 'terminal' ? 'lex-modeBtn lex-modeBtn--active' : 'lex-modeBtn'} onClick={() => updateBottomTab('terminal')}>
                  Terminal
                </button>
                <button type="button" className={workbench.bottomTab === 'logs' ? 'lex-modeBtn lex-modeBtn--active' : 'lex-modeBtn'} onClick={() => updateBottomTab('logs')}>
                  Output
                </button>
              </div>
              <button className="lex-btn" type="button" onClick={() => setWorkbench((p) => ({ ...p, bottomVisible: !p.bottomVisible }))}>
                Collapse
              </button>
            </div>
            <div className="lex-bottomBody">{workbench.bottomTab === 'terminal' ? <TerminalPanel cwd={workspaceRoot} /> : <LogsPanel lines={logs} onClear={() => setLogs([])} />}</div>
          </section>
        </div>

        <aside className="lex-chatColumn" aria-label="Assistant chat">
          <div className="lex-chatColumnHeader">Chat</div>
          <div className="lex-chatUndoBar">
            <button type="button" className="lex-btn lex-btn--small" onClick={() => void handleUndo()} disabled={!undo.state.canUndo}>
              Undo
            </button>
            <button type="button" className="lex-btn lex-btn--small" onClick={() => void handleRedo()} disabled={!undo.state.canRedo}>
              Redo
            </button>
          </div>
          <div className="lex-chatTabBar" role="tablist">
            {chatTabs.map((t) => (
              <div key={t.id} className="lex-chatTabRow">
                <button
                  type="button"
                  role="tab"
                  className={t.id === activeChatId ? 'lex-chatTab lex-chatTab--active' : 'lex-chatTab'}
                  onClick={() => setActiveChatId(t.id)}
                  title={t.title}
                >
                  <span className="lex-chatTabLabel">{t.title}</span>
                </button>
                {chatTabs.length > 1 ? (
                  <button type="button" className="lex-chatTabClose" aria-label="Close tab" onClick={() => closeChatTab(t.id)}>
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            <button type="button" className="lex-chatTabAdd" title="New chat" onClick={newChatTab}>
              +
            </button>
          </div>
          <ChatPanel
            ref={chatPanelRef}
            messages={activeMessages}
            onSend={onSendChat}
            inputRef={chatInputRef}
            clarification={clarification}
            onClarificationSelect={onClarificationSelect}
            mentionCandidates={mentionCandidates}
            onPlanAllow={handlePlanAllow}
            onPlanReject={handlePlanReject}
            onDiffApply={handleDiffApply}
            onDiffCancel={handleDiffCancel}
          />
        </aside>
      </div>

      <StatusBar
        branch="main"
        errorCount={0}
        warningCount={0}
        line={cursor.line}
        col={cursor.col}
        spaces={4}
        encoding={encoding}
        languageMode={statusLanguageLabel(activeRelPath, languageOverride)}
        modelHint={statusLine}
        modelLabel={modelLabel}
        indexLabel={indexLabel}
        tokenEstimate={tokenEstimate}
        paletteKind={paletteKind}
        onOpenPalette={(kind) => setPaletteKind(kind)}
        onClosePalette={() => setPaletteKind(null)}
        onSelectEncoding={(v) => {
          setEncoding(v)
          setPaletteKind(null)
        }}
        onSelectLanguage={(v) => {
          setLanguageOverride(v)
          setPaletteKind(null)
        }}
      />

      <OnboardingOverlay
        open={!settings.onboardingCompleted}
        hasConnectedModel={Boolean(connectedProfileId)}
        hasWorkspace={Boolean(workspaceRoot)}
        hasSentMessage={hasSentMessage}
        onGoSettings={() => updateActivityView('settings')}
        onGoExplorer={() => updateActivityView('explorer')}
        onGoChat={() => setWorkbench((prev) => ({ ...prev, activityView: 'search' }))}
        onComplete={() => setSettings((prev) => ({ ...prev, onboardingCompleted: true }))}
      />
    </div>
    </NotificationProvider>
  )
}

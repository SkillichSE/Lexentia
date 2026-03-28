import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatPanel, type ChatMessage } from './ChatPanel'
import { EditorPanel } from './EditorPanel'
import { LogsPanel } from './LogsPanel'
import { ModelService } from '../../services/modelService'
import { ToolsClient } from '../../tools/ToolsClient'
import { downloadText, HistoryService } from '../../services/historyService'
import { FileExplorerPanel } from './FileExplorerPanel'
import { TerminalPanel } from './TerminalPanel'
import { loadProfiles, saveProfiles, setActiveProfile, upsertProfile, type ModelProfile } from '../../services/modelProfiles'
import { ActivityBar } from './ActivityBar'
import { SettingsView } from './SettingsView'
import { OnboardingOverlay } from './OnboardingOverlay'
import { FilesPanel } from './FilesPanel'
import { loadSettings, saveSettings } from '../../services/settingsService'
import { loadWorkbenchState, saveWorkbenchState, type ActivityView, type BottomTab, type MainView } from '../../state/workbenchState'
import type { LexAction, PlanResult } from '../../services/modelService'
import { CommandPalette, type CommandItem } from './CommandPalette'
import { MenuBar } from './MenuBar'

export function IdeShell() {
  const [workbench, setWorkbench] = useState(() => loadWorkbenchState())
  const [settings, setSettings] = useState(() => loadSettings())
  const [profilesState, setProfilesState] = useState(() => loadProfiles())
  const activeProfile = profilesState.profiles.find((p) => p.id === profilesState.activeProfileId) as ModelProfile
  const [connectedProfileId, setConnectedProfileId] = useState<string | null>(null)
  const modelService = useMemo(() => new ModelService(), [])
  const toolsClient = useMemo(() => new ToolsClient(settings.toolsBaseUrl), [settings.toolsBaseUrl])
  const historyService = useMemo(() => new HistoryService(), [])
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: `m-${Date.now()}-assistant`, role: 'assistant', content: 'Welcome! Connect a model in Settings and describe your task.', createdAt: Date.now() }])
  const [logs, setLogs] = useState<string[]>(['Lexentia: workbench started'])
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [toolContext, setToolContext] = useState<string>('')
  const [actionsByMessageId, setActionsByMessageId] = useState<Record<string, LexAction[] | undefined>>({})
  const [sharedTerminalId, setSharedTerminalId] = useState<string | null>(null)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([])
  const [filesIndexedAt, setFilesIndexedAt] = useState<number>(0)
  const [session] = useState(() => historyService.createSession(undefined))
  const [clarification, setClarification] = useState<{ question: string; options: string[] } | null>(null)
  const [tabs, setTabs] = useState<{ relPath: string; name: string; content: string; isDirty: boolean }[]>([])
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [openFolderTrigger, setOpenFolderTrigger] = useState(0)
  const [explorerResync, setExplorerResync] = useState<{ key: number; dir: string } | undefined>(undefined)
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null)

  const getContentForMessage = (result: any): string => {
    if (result.type === 'plan') {
      const plan = result as PlanResult
      return `Plan: ${plan.title}\n\n${plan.description}\n\nSteps:\n${plan.steps.map((step, i) => `${i + 1}. ${step.title}: ${step.description}`).join('\n')}`
    }
    return result.content
  }

  useEffect(() => {
    ;(async () => {
      const res = await window.lexentia.window.isMaximized()
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
    const onDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.code === 'KeyP' && e.shiftKey) {
        e.preventDefault()
        setCmdkOpen(true)
        return
      }
      if (mod && e.code === 'KeyP' && !e.shiftKey) {
        e.preventDefault()
        void openFileFromDialog()
        return
      }
      if (mod && e.code === 'Comma') {
        e.preventDefault()
        setWorkbench((p) => ({ ...p, activityView: 'settings', mainView: 'settings' }))
        return
      }
      if (mod && e.code === 'Backquote') {
        e.preventDefault()
        setWorkbench((p) => ({ ...p, bottomVisible: !p.bottomVisible, bottomTab: 'terminal' }))
        return
      }
      if (mod && e.code === 'KeyO') {
        e.preventDefault()
        setOpenFolderTrigger((p) => p + 1)
        return
      }
      if (mod && e.code === 'KeyN') {
        e.preventDefault()
        void createNewFile()
      }
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRoot])

  const statusLine = useMemo(() => {
    if (!connectedProfileId) return 'Model not connected'
    const p = profilesState.profiles.find((x) => x.id === connectedProfileId)
    return p ? `Model: ${p.name}` : 'Model not connected'
  }, [connectedProfileId, profilesState.profiles])

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
    const parts: string[] = [baseText]
    if (toolContext.trim()) parts.push(`[TOOL_CONTEXT]\n${toolContext.trim()}`)
    if (extractedText) parts.push(`[EXTRACTED_FILES_TEXT]\n${extractedText}`)
    return parts.filter(Boolean).join('\n\n').trim()
  }

  const updateActivityView = (view: ActivityView) => {
    setWorkbench((prev) => ({
      ...prev,
      activityView: view,
      mainView: view === 'chat' ? 'chat' : view === 'settings' ? 'settings' : prev.mainView,
    }))
  }
  const updateMainView = (view: MainView) => setWorkbench((prev) => ({ ...prev, mainView: view }))
  const updateBottomTab = (tab: BottomTab) => setWorkbench((prev) => ({ ...prev, bottomVisible: true, bottomTab: tab }))

  const indexWorkspaceFiles = async () => {
    if (!workspaceRoot) return
    const startedAt = Date.now()
    const out: string[] = []
    const queue: string[] = ['.']
    const seen = new Set<string>()
    const maxFiles = 2000
    const maxDirs = 400

    let dirs = 0
    while (queue.length && out.length < maxFiles && dirs < maxDirs) {
      const dir = queue.shift()!
      if (seen.has(dir)) continue
      seen.add(dir)
      dirs++
      const res = await window.lexentia.fs.listDir(dir)
      if (!res.ok) continue
      for (const e of res.entries ?? []) {
        const rel = dir === '.' ? e.name : `${dir}/${e.name}`
        if (e.isDir) {
          // skip common heavy dirs
          if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'dist-electron') continue
          queue.push(rel)
        } else {
          out.push(rel)
          if (out.length >= maxFiles) break
        }
      }
    }
    setWorkspaceFiles(out)
    setFilesIndexedAt(startedAt)
    addLog(`Indexed files: ${out.length}`)
  }

  const openFile = async (relPath: string) => {
    const already = tabs.find((t) => t.relPath === relPath)
    if (already) {
      setActiveRelPath(relPath)
      updateMainView('editor')
      return
    }
    const res = await window.lexentia.fs.readFile(relPath)
    if (!res.ok) return addLog(`Failed to open file: ${relPath}`)
    setTabs((prev) => [...prev, { relPath, name: relPath.split('/').pop() || relPath, content: res.content ?? '', isDirty: false }])
    setActiveRelPath(relPath)
    setWorkbench((prev) => ({ ...prev, activityView: 'explorer', mainView: 'editor' }))
    addLog(`Opened: ${relPath}`)
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

  const closeTab = (relPath: string) => {
    setTabs((prev) => prev.filter((t) => t.relPath !== relPath))
    setActiveRelPath((prev) => {
      if (prev !== relPath) return prev
      const remaining = tabs.filter((t) => t.relPath !== relPath)
      return remaining.length ? remaining[remaining.length - 1].relPath : null
    })
  }

  const ensureSharedTerminal = async (cwd?: string | null) => {
    if (sharedTerminalId) return sharedTerminalId
    const res = await window.lexentia.terminal.create({ cwd: cwd ?? workspaceRoot })
    if (!res.ok || !res.id) throw new Error('Failed to create terminal')
    setSharedTerminalId(res.id)
    return res.id
  }

  const approveAction = async (messageId: string, action: LexAction) => {
    try {
      addLog(`Action approved: ${action.type}`)
      if (action.type === 'skills.list') {
        const res = await window.lexentia.skills.list()
        if (!res.ok) throw new Error(res.error ?? 'skills.list failed')
        const lines = (res.entries ?? []).map((e) => `- ${e.name} (${Math.round(e.size / 1024)} KB)`).join('\n')
        setToolContext((p) => `${p}\n\n[SKILLS_LIST]\n${lines}`.trim())
        setMessages((prev) => [...prev, { id: `m-${Date.now()}-assistant`, role: 'assistant', content: `Skills available:\n${lines || '(empty)'}`, createdAt: Date.now() }])
      } else if (action.type === 'skills.read') {
        const res = await window.lexentia.skills.read(action.name)
        if (!res.ok) throw new Error(res.error ?? 'skills.read failed')
        const block = `SKILL: ${action.name}\n-----\n${res.content ?? ''}`.trim()
        setToolContext((p) => `${p}\n\n[SKILL]\n${block}`.trim())
        setMessages((prev) => [...prev, { id: `m-${Date.now()}-assistant`, role: 'assistant', content: block, createdAt: Date.now() }])
      } else if (action.type === 'fs.listDir') {
        const res = await window.lexentia.fs.listDir(action.relPath)
        if (!res.ok) throw new Error(res.error ?? 'fs.listDir failed')
        const entries = res.entries ?? []
        const lines = entries.map((e) => `${e.isDir ? 'd' : '-'} ${e.name}  ${e.size}b`).join('\n')
        const block = `DIR: ${action.relPath}\n-----\n${lines}`.trim()
        setToolContext((p) => `${p}\n\n[DIR_LIST]\n${block}`.trim())
        setMessages((prev) => [...prev, { id: `m-${Date.now()}-assistant`, role: 'assistant', content: block, createdAt: Date.now() }])
      } else if (action.type === 'fs.readFile') {
        const res = await window.lexentia.fs.readFile(action.relPath)
        if (!res.ok) throw new Error(res.error ?? 'fs.readFile failed')
        const block = `FILE: ${action.relPath}\n-----\n${res.content ?? ''}`.trim()
        setToolContext((p) => `${p}\n\n[FILE]\n${block}`.trim())
        setMessages((prev) => [...prev, { id: `m-${Date.now()}-assistant`, role: 'assistant', content: block, createdAt: Date.now() }])
      } else if (action.type === 'fs.writeFile') {
        if (!workspaceRoot) throw new Error('Workspace not opened')
        const res = await window.lexentia.fs.writeFile(action.relPath, action.content ?? '')
        if (!res.ok) throw new Error(res.error ?? 'fs.writeFile failed')
        addLog(`Wrote file: ${action.relPath}`)
        // open after writing
        await openFile(action.relPath)
      } else if (action.type === 'terminal.run') {
        const id = await ensureSharedTerminal(action.cwd ?? workspaceRoot)
        await window.lexentia.terminal.write(id, `${action.command}\n`)
        setWorkbench((p) => ({ ...p, bottomVisible: true, bottomTab: 'terminal' }))
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e)
      addLog(`Action failed: ${msg}`)
      setMessages((prev) => [...prev, { id: `m-${Date.now()}-assistant`, role: 'assistant', content: `Action failed: ${msg}`, createdAt: Date.now() }])
    } finally {
      setActionsByMessageId((prev) => ({ ...prev, [messageId]: undefined }))
    }
  }

  const cmdkItems: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      {
        id: 'cmd.openFolder',
        label: 'Open Folder…',
        detail: 'Explorer',
        kind: 'command',
        onRun: async () => {
          setWorkbench((p) => ({ ...p, activityView: 'explorer' }))
          // trigger explorer open dialog via IPC by calling it here
          const res = await window.lexentia.workspace.openFolder()
          if (res.ok) setWorkspaceRoot(res.workspaceRoot ?? null)
        },
      },
      {
        id: 'cmd.pickFile',
        label: 'Open File…',
        detail: 'Native file dialog',
        kind: 'command',
        onRun: async () => {
          if (!workspaceRoot) return
          const res = await window.lexentia.workspace.pickFile()
          if (!res.ok) return
          const rel = (res.relPath ?? '').replace(/\\/g, '/')
          if (rel) await openFile(rel)
        },
      },
      {
        id: 'cmd.openChat',
        label: 'Focus Chat',
        detail: 'Chat',
        kind: 'command',
        onRun: () => setWorkbench((p) => ({ ...p, activityView: 'chat', mainView: 'chat' })),
      },
      {
        id: 'cmd.openExplorer',
        label: 'Focus Explorer',
        detail: 'Explorer',
        kind: 'command',
        onRun: () => setWorkbench((p) => ({ ...p, activityView: 'explorer' })),
      },
      {
        id: 'cmd.openSettings',
        label: 'Open Settings',
        detail: 'Main area',
        kind: 'command',
        onRun: () => setWorkbench((p) => ({ ...p, activityView: 'settings', mainView: 'settings' })),
      },
      {
        id: 'cmd.toggleTerminal',
        label: 'Toggle Terminal',
        detail: 'Bottom panel',
        kind: 'command',
        onRun: () => setWorkbench((p) => ({ ...p, bottomVisible: !p.bottomVisible, bottomTab: 'terminal' })),
      },
      {
        id: 'cmd.openLogs',
        label: 'Open Logs',
        detail: 'Bottom panel',
        kind: 'command',
        onRun: () => setWorkbench((p) => ({ ...p, bottomVisible: true, bottomTab: 'logs' })),
      },
      {
        id: 'cmd.indexFiles',
        label: 'Index workspace files',
        detail: workspaceRoot ? `Last: ${filesIndexedAt ? new Date(filesIndexedAt).toLocaleTimeString() : 'never'}` : 'Open a folder first',
        kind: 'command',
        onRun: () => void indexWorkspaceFiles(),
      },
    ]

    const fileItems: CommandItem[] = workspaceFiles.slice(0, 2000).map((rel) => ({
      id: `file.${rel}`,
      label: rel.split('/').pop() || rel,
      detail: rel,
      kind: 'file',
      onRun: () => void openFile(rel),
    }))

    return [...base, ...fileItems]
  }, [filesIndexedAt, openFile, workspaceFiles, workspaceRoot])

  const onClarificationSelect = (option: string) => {
    if (!connectedProfileId) return setClarification(null)
    const now = Date.now()
    setClarification(null)
    const userMsg: ChatMessage = { id: `m-${now}-user`, role: 'user', content: option, createdAt: now }
    const assistantId = `m-${now}-assistant`
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: 'Thinking…', createdAt: now + 1 }])
    historyService.addMessage(session.id, userMsg, activeProfile.model)
    ;(async () => {
      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }))
        const result = await modelService.next([...history, { role: 'user', content: applyExtractedContext(option) }], activeProfile, { temperature: settings.temperature, topP: settings.topP })
        if (result.type === 'clarify') {
          const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
          setClarification({ question: result.question, options: result.options })
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
          return
        }
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: getContentForMessage(result) } : m)))
        if (result.type === 'final' && result.actions?.length) {
          setActionsByMessageId((p) => ({ ...p, [assistantId]: result.actions }))
        }
        historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: getContentForMessage(result), createdAt: now + 1 }, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Model request failed: ${msg}` } : m)))
      }
    })()
  }

  const onSendChat = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = Date.now()
    const userMsg: ChatMessage = { id: `m-${now}-user`, role: 'user', content: trimmed, createdAt: now }
    const assistantId = `m-${now}-assistant`
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: 'Thinking…', createdAt: now + 1 }])
    historyService.addMessage(session.id, userMsg, activeProfile.model)
    ;(async () => {
      if (!connectedProfileId) {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: 'Connect a model first in Settings (Connect).' } : m)))
        return
      }
      try {
        const filesToExtract: File[] = []
        if (filesToExtract.length) {
          const parts: string[] = []
          for (const f of filesToExtract) {
            const res = await toolsClient.extractByExtension(f)
            parts.push(`FILE: ${f.name}\n-----\n${res.text}`)
          }
          const combined = parts.join('\n\n')
          setExtractedText(combined)
          const history = messages.map((m) => ({ role: m.role, content: m.content }))
          const result = await modelService.next([...history, { role: 'user', content: `${trimmed}\n\n[EXTRACTED_FILES_TEXT]\n${combined}`.trim() }], activeProfile, { temperature: settings.temperature, topP: settings.topP })
          if (result.type === 'clarify') {
            const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
            setClarification({ question: result.question, options: result.options })
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
            return
          }
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: getContentForMessage(result) } : m)))
          return
        }

        const history = messages.map((m) => ({ role: m.role, content: m.content }))
        const result = await modelService.next([...history, { role: 'user', content: trimmed }], activeProfile, { temperature: settings.temperature, topP: settings.topP })
        if (result.type === 'clarify') {
          const clarifyContent = `Clarification: ${result.question}\n\nOptions:\n- ${result.options.join('\n- ')}`
          setClarification({ question: result.question, options: result.options })
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clarifyContent } : m)))
          historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: clarifyContent, createdAt: now + 1 }, activeProfile.model)
          return
        }
        setClarification(null)
        const contentForMessage = getContentForMessage(result)
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: contentForMessage } : m)))
        if (result.type === 'final' && result.actions?.length) {
          setActionsByMessageId((p) => ({ ...p, [assistantId]: result.actions }))
        }
        historyService.addMessage(session.id, { id: assistantId, role: 'assistant', content: contentForMessage, createdAt: now + 1 }, activeProfile.model)
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Unknown error'
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Model request failed: ${msg}` } : m)))
      }
    })()
  }

  const openFolder = async () => {
    setOpenFolderTrigger((prev) => prev + 1)
  }

  const createNewFile = async () => {
    if (!workspaceRoot) {
      addLog('Open a workspace folder first.')
      return
    }
    const res = await window.lexentia.workspace.newFile()
    if (!res.ok) {
      if (res.error) addLog(res.error)
      return
    }
    const normalized = (res.relPath ?? '').replace(/\\/g, '/').replace(/^[/\\]+/, '')
    if (!normalized) return
    addLog(`Created: ${normalized}`)
    const parent = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '.'
    setExplorerResync((prev) => ({ key: (prev?.key ?? 0) + 1, dir: parent }))
    await openFile(normalized)
  }

  const openFileFromDialog = async () => {
    if (!workspaceRoot) {
      addLog('Open a workspace folder first.')
      return
    }
    const res = await window.lexentia.workspace.pickFile()
    if (!res.ok) {
      if (res.error) addLog(res.error)
      return
    }
    const rel = (res.relPath ?? '').replace(/\\/g, '/')
    if (rel) await openFile(rel)
  }

  const hasSentMessage = messages.some((m) => m.role === 'user')
  const activeFile = activeRelPath ? tabs.find((t) => t.relPath === activeRelPath) ?? null : null

  return (
    <div className="lex-root">
      {/* Top Bar with Settings */}
      <div className="lex-topbar">
        <div className="lex-brand">Lexentia</div>
        <MenuBar
          onNewFile={createNewFile}
          onOpenFile={openFileFromDialog}
          onOpenFolder={openFolder}
          onSave={saveActive}
          onReload={() => window.location.reload()}
          onCommandPalette={() => setCmdkOpen(true)}
        />
        <button className="lex-menubtn" onClick={() => updateMainView('settings')}>Settings</button>
        <div className="lex-status">{statusLine}</div>
        <div className="lex-windowControls">
          <button className="lex-windowBtn" onClick={() => window.lexentia.window.minimize()} title="Minimize">&#8211;</button>
          <button className="lex-windowBtn" onClick={async () => { const res = await window.lexentia.window.toggleMaximize(); if (res.ok) setIsMaximized(res.isMaximized) }} title="Maximize">{isMaximized ? '❐' : '□'}</button>
          <button className="lex-windowBtn lex-windowBtn--close" onClick={() => window.lexentia.window.close()} title="Close">×</button>
        </div>
      </div>

      {/* Main VSCode-like Layout */}
      <div className="lex-workbench">
        {/* Left Sidebar - File Explorer */}
        <aside className="lex-sidebar">
          <FileExplorerPanel
            onOpenFile={openFile}
            onWorkspaceChanged={setWorkspaceRoot}
            openFolderSignal={openFolderTrigger}
            resyncDir={explorerResync}
          />
        </aside>

        {/* Center - Main Content with Tabs */}
        <main className="lex-main">
          <div className="lex-mainContent">
            {workbench.mainView === 'settings' ? (
              <div className="lex-mainPane">
                <div className="lex-sectionTitle" style={{ marginBottom: 12 }}>Settings</div>
                <SettingsView
                  profilesState={profilesState}
                  activeProfile={activeProfile}
                  onActiveProfileIdChange={(id) => { const next = setActiveProfile(profilesState, id); setProfilesState(next); saveProfiles(next) }}
                  onModelNameChange={(v) => { const next = upsertProfile(profilesState, { ...activeProfile, model: v }); setProfilesState(next); saveProfiles(next) }}
                  onBaseUrlChange={(v) => { const next = upsertProfile(profilesState, { ...activeProfile, baseUrl: v }); setProfilesState(next); saveProfiles(next) }}
                  onApiKeyChange={activeProfile.provider === 'openai_compatible' ? (v) => { const next = upsertProfile(profilesState, { ...activeProfile, apiKey: v || undefined }); setProfilesState(next); saveProfiles(next) } : undefined}
                  onConnectModel={onConnectModel}
                  toolsBaseUrl={settings.toolsBaseUrl}
                  onToolsBaseUrlChange={(v) => setSettings((p) => ({ ...p, toolsBaseUrl: v }))}
                  temperature={settings.temperature}
                  onTemperatureChange={(v) => setSettings((p) => ({ ...p, temperature: v }))}
                  topP={settings.topP}
                  onTopPChange={(v) => setSettings((p) => ({ ...p, topP: v }))}
                  onExportHistory={exportHistory}
                  onClearHistory={clearHistory}
                  onResetOnboarding={() => setSettings((p) => ({ ...p, onboardingCompleted: false }))}
                />
              </div>
            ) : (
              <div className="lex-editorHost">
                <div className="lex-editorTabsBar">
                  <div className="lex-editorTabsScroller">
                    {tabs.length === 0 ? (
                      <div className="lex-subtle">No files open</div>
                    ) : (
                      tabs.map((t) => (
                        <div
                          key={t.relPath}
                          className={t.relPath === activeRelPath ? 'lex-tab lex-tab--active' : 'lex-tab'}
                          onClick={() => setActiveRelPath(t.relPath)}
                        >
                          <span className="lex-tabName">{t.name}</span>
                          {t.isDirty ? <span className="lex-tabDirty">•</span> : null}
                          <button
                            className="lex-tabClose"
                            type="button"
                            aria-label={`Close ${t.name}`}
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
                  {activeRelPath ? (
                    <button className="lex-saveBtn lex-btn lex-btn--primary" onClick={saveActive}>
                      Save
                    </button>
                  ) : null}
                </div>
                <EditorPanel
                  extractedText={extractedText}
                  hasWorkspace={Boolean(workspaceRoot)}
                  activeFile={activeFile}
                  onOpenFile={openFileFromDialog}
                  onNewFile={createNewFile}
                  onOpenFolder={openFolder}
                  developersUrl="https://github.com/SkillichSE/Lexentia/tree/master"
                  onChange={(content) => {
                    const rel = activeRelPath
                    if (!rel) return
                    setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, content, isDirty: true } : t)))
                  }}
                  onSave={saveActive}
                />
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - AI Chat */}
        <aside className="lex-secondary">
          <div className="lex-sectionTitle">AI Chat</div>
          <ChatPanel
            messages={messages}
            onSend={onSendChat}
            inputRef={chatInputRef}
            clarification={clarification}
            onClarificationSelect={onClarificationSelect}
            actionsByMessageId={actionsByMessageId}
            onApproveAction={approveAction}
          />
        </aside>

      </div>

      <CommandPalette
        open={cmdkOpen}
        title="Command Palette"
        items={cmdkItems}
        onClose={() => setCmdkOpen(false)}
      />

      <OnboardingOverlay
        open={!settings.onboardingCompleted}
        hasConnectedModel={Boolean(connectedProfileId)}
        hasWorkspace={Boolean(workspaceRoot)}
        hasSentMessage={hasSentMessage}
        onGoSettings={() => updateMainView('settings')}
        onGoExplorer={() => updateActivityView('explorer')}
        onGoChat={() => setWorkbench((prev) => ({ ...prev, activityView: 'chat', mainView: 'chat' }))}
        onComplete={() => setSettings((prev) => ({ ...prev, onboardingCompleted: true }))}
      />
    </div>
  )
}


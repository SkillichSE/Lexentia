export type PersistedChatRole = 'user' | 'assistant' | 'system'

export type PersistedMessage = {
  id: string
  role: PersistedChatRole
  content: string
  createdAt: number
}

export type HistorySession = {
  id: string
  createdAt: number
  updatedAt: number
  modelName?: string
  messages: PersistedMessage[]
}

export type HistoryStore = {
  version: 1
  sessions: HistorySession[]
}

const STORAGE_KEY = 'lexentia.history.v1'

// FIX: cap stored sessions to prevent localStorage from growing unboundedly
const MAX_SESSIONS = 20
const MAX_MESSAGES_PER_SESSION = 200

function safeParseJson(input: string): any | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function now() {
  return Date.now()
}

function makeId(prefix: string) {
  return `${prefix}-${now()}-${Math.random().toString(16).slice(2)}`
}

export class HistoryService {
  private loadStore(): HistoryStore {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, sessions: [] }
    const parsed = safeParseJson(raw)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) return { version: 1, sessions: [] }
    return parsed as HistoryStore
  }

  private saveStore(store: HistoryStore) {
    // FIX: trim to MAX_SESSIONS before saving (newest first)
    store.sessions = store.sessions.slice(0, MAX_SESSIONS)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      // localStorage quota exceeded — drop oldest half and retry
      store.sessions = store.sessions.slice(0, Math.floor(MAX_SESSIONS / 2))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      } catch {
        // give up silently — history is non-critical
      }
    }
  }

  createSession(modelName?: string): HistorySession {
    const store = this.loadStore()
    const session: HistorySession = {
      id: makeId('session'),
      createdAt: now(),
      updatedAt: now(),
      modelName,
      messages: [],
    }
    store.sessions.unshift(session)
    this.saveStore(store)
    return session
  }

  getSession(sessionId: string): HistorySession | null {
    const store = this.loadStore()
    return store.sessions.find((s) => s.id === sessionId) ?? null
  }

  addMessage(sessionId: string, msg: PersistedMessage, modelName?: string) {
    const store = this.loadStore()
    const idx = store.sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return
    const session = store.sessions[idx]
    session.modelName = modelName ?? session.modelName
    // FIX: cap messages per session to avoid huge individual entries
    session.messages.push(msg)
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION)
    }
    session.updatedAt = now()
    this.saveStore(store)
  }

  exportSession(sessionId: string): string {
    const session = this.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    return JSON.stringify(session, null, 2)
  }

  clearAll() {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ring buffer for outbound / local data flow (privacy-first; no secrets stored)

export type PrivacyKind = 'note' | 'model_outbound' | 'local_tools' | 'indexing' | 'file_scope'

export type PrivacyEntry = {
  id: string
  at: number
  kind: PrivacyKind
  title: string
  detail?: string
}

const MAX = 40

function id() {
  return `p-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function createPrivacyLog() {
  const entries: PrivacyEntry[] = []

  function push(e: Omit<PrivacyEntry, 'id' | 'at'>) {
    const row: PrivacyEntry = { ...e, id: id(), at: Date.now() }
    entries.unshift(row)
    while (entries.length > MAX) entries.pop()
    return [...entries]
  }

  function snapshot() {
    return [...entries]
  }

  function clear() {
    entries.length = 0
    return [] as PrivacyEntry[]
  }

  return { push, snapshot, clear }
}

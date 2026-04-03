// memory system per optimization spec section 9
// three levels: session, project, user behavior

// session memory: recent messages and context
interface SessionMemory {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
  maxMessages: number
}

// project memory: rules and conventions
export interface ProjectMemory {
  rules: string[]
  conventions: string[]
  learnedPatterns: string[]
  lastUpdated: number
}

// user behavior: preferences and feedback
interface UserBehavior {
  acceptedChanges: string[]
  rejectedChanges: string[]
  preferredModelSize: 'small' | 'large' | null
  commonTasks: Record<string, number>
}

// storage keys
const STORAGE_KEYS = {
  session: 'lexentia.memory.session',
  project: '.lexentia/memory.json',
  user: 'lexentia.memory.user'
}

// session memory implementation
export function createSessionMemory(maxMessages: number = 10): SessionMemory {
  return {
    messages: [],
    maxMessages
  }
}

export function addToSessionMemory(
  memory: SessionMemory,
  message: { role: 'user' | 'assistant'; content: string }
): SessionMemory {
  const updated = {
    ...memory,
    messages: [
      ...memory.messages,
      { ...message, timestamp: Date.now() }
    ].slice(-memory.maxMessages)
  }

  // persist to localstorage
  try {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }

  return updated
}

export function loadSessionMemory(): SessionMemory | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // ignore parse errors
  }
  return null
}

// project memory implementation per spec section 9.2
export function createProjectMemory(): ProjectMemory {
  return {
    rules: [],
    conventions: [],
    learnedPatterns: [],
    lastUpdated: Date.now()
  }
}

export function addProjectRule(memory: ProjectMemory, rule: string): ProjectMemory {
  return {
    ...memory,
    rules: [...memory.rules, rule],
    lastUpdated: Date.now()
  }
}

export function addProjectConvention(memory: ProjectMemory, convention: string): ProjectMemory {
  return {
    ...memory,
    conventions: [...memory.conventions, convention],
    lastUpdated: Date.now()
  }
}

export function addLearnedPattern(memory: ProjectMemory, pattern: string): ProjectMemory {
  if (memory.learnedPatterns.includes(pattern)) return memory

  return {
    ...memory,
    learnedPatterns: [...memory.learnedPatterns, pattern],
    lastUpdated: Date.now()
  }
}

// format project memory for prompt injection per spec section 9.3
export function formatProjectMemory(memory: ProjectMemory): string {
  if (memory.rules.length === 0 && memory.conventions.length === 0 && memory.learnedPatterns.length === 0) {
    return ''
  }

  const parts: string[] = []

  if (memory.rules.length > 0) {
    parts.push(`rules:\n${memory.rules.map(r => `- ${r}`).join('\n')}`)
  }

  if (memory.conventions.length > 0) {
    parts.push(`conventions:\n${memory.conventions.map(c => `- ${c}`).join('\n')}`)
  }

  if (memory.learnedPatterns.length > 0) {
    parts.push(`patterns:\n${memory.learnedPatterns.map(p => `- ${p}`).join('\n')}`)
  }

  return `[project memory]\n${parts.join('\n\n')}\n`
}

// user behavior implementation
export function createUserBehavior(): UserBehavior {
  return {
    acceptedChanges: [],
    rejectedChanges: [],
    preferredModelSize: null,
    commonTasks: {}
  }
}

export function recordFeedback(
  behavior: UserBehavior,
  change: string,
  accepted: boolean
): UserBehavior {
  const updated = { ...behavior }

  if (accepted) {
    updated.acceptedChanges = [...behavior.acceptedChanges, change].slice(-50)
  } else {
    updated.rejectedChanges = [...behavior.rejectedChanges, change].slice(-50)
  }

  // persist
  try {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated))
  } catch {
    // ignore
  }

  return updated
}

export function recordTask(behavior: UserBehavior, taskType: string): UserBehavior {
  const updated = {
    ...behavior,
    commonTasks: {
      ...behavior.commonTasks,
      [taskType]: (behavior.commonTasks[taskType] || 0) + 1
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated))
  } catch {
    // ignore
  }

  return updated
}

export function getPreferredModelSize(behavior: UserBehavior): 'small' | 'large' | null {
  // infer from acceptance rate
  const total = behavior.acceptedChanges.length + behavior.rejectedChanges.length
  if (total < 10) return null // not enough data

  const acceptanceRate = behavior.acceptedChanges.length / total

  // if acceptance rate is low with current model, suggest larger
  if (acceptanceRate < 0.5) return 'large'
  if (acceptanceRate > 0.8) return 'small' // small model is working well

  return null
}

// memory system hook
export function useMemorySystem() {
  const session = loadSessionMemory() || createSessionMemory()

  return {
    session,
    addToSession: (msg: { role: 'user' | 'assistant'; content: string }) =>
      addToSessionMemory(session, msg),
    formatProject: formatProjectMemory,
    createProject: createProjectMemory,
    addRule: addProjectRule,
    addConvention: addProjectConvention,
    addPattern: addLearnedPattern,
    recordFeedback,
    recordTask,
    getPreferredModelSize
  }
}

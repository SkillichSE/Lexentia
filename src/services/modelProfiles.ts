export type ModelProviderType = 'ollama' | 'openai_compatible'

export type ModelProfile = {
  id: string
  name: string
  provider: ModelProviderType
  baseUrl: string
  model: string
  apiKey?: string
}

export type ModelProfilesState = {
  version: 1
  activeProfileId: string
  profiles: ModelProfile[]
}

const KEY = 'lex.modelProfiles.v1'

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function defaultProfiles(): ModelProfilesState {
  const ollamaId = makeId('profile')
  const lmStudioId = makeId('profile')
  return {
    version: 1,
    activeProfileId: ollamaId,
    profiles: [
      {
        id: ollamaId,
        name: 'Ollama (local)',
        provider: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama3',
      },
      {
        id: lmStudioId,
        name: 'LM Studio (OpenAI-compatible)',
        provider: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:1234/v1',
        model: 'local-model',
      },
    ],
  }
}

export function loadProfiles(): ModelProfilesState {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    const d = defaultProfiles()
    localStorage.setItem(KEY, JSON.stringify(d))
    return d
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.profiles) || !parsed.activeProfileId) throw new Error('bad')
    return parsed as ModelProfilesState
  } catch {
    const d = defaultProfiles()
    localStorage.setItem(KEY, JSON.stringify(d))
    return d
  }
}

export function saveProfiles(state: ModelProfilesState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function upsertProfile(state: ModelProfilesState, profile: ModelProfile): ModelProfilesState {
  const idx = state.profiles.findIndex((p) => p.id === profile.id)
  const profiles = idx === -1 ? [...state.profiles, profile] : state.profiles.map((p) => (p.id === profile.id ? profile : p))
  return { ...state, profiles }
}

export function setActiveProfile(state: ModelProfilesState, id: string): ModelProfilesState {
  return { ...state, activeProfileId: id }
}


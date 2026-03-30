import type { PromptBudgetMode } from './promptBudget'

export type LexSettings = {
  version: 1
  toolsBaseUrl: string
  temperature: number
  topP: number
  promptBudgetMode: PromptBudgetMode
  onboardingCompleted: boolean
}

const KEY = 'lex.settings.v1'

const DEFAULTS: LexSettings = {
  version: 1,
  toolsBaseUrl: 'http://127.0.0.1:8000',
  temperature: 0.2,
  topP: 0.9,
  promptBudgetMode: 'auto',
  onboardingCompleted: false,
}

const BUDGET_MODES: PromptBudgetMode[] = ['auto', 'small', 'balanced', 'large']

function parsePromptBudgetMode(v: unknown): PromptBudgetMode {
  return typeof v === 'string' && BUDGET_MODES.includes(v as PromptBudgetMode) ? (v as PromptBudgetMode) : 'auto'
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function loadSettings(): LexSettings {
  const raw = localStorage.getItem(KEY)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<LexSettings>
    if (parsed.version !== 1) return DEFAULTS
    return {
      version: 1,
      toolsBaseUrl: String(parsed.toolsBaseUrl ?? DEFAULTS.toolsBaseUrl),
      temperature: clamp(Number(parsed.temperature ?? DEFAULTS.temperature), 0, 2),
      topP: clamp(Number(parsed.topP ?? DEFAULTS.topP), 0, 1),
      promptBudgetMode: parsePromptBudgetMode(parsed.promptBudgetMode),
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
    }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: LexSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

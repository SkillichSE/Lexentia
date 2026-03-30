export type PromptBudgetMode = 'auto' | 'small' | 'balanced' | 'large'

export type PromptBudget = {
  label: string
  tier: 'small' | 'balanced' | 'large'
  maxTotalChars: number
  maxAttachmentBlockChars: number
  maxExtractedChars: number
  maxLineChatFileChars: number
  maxInlineChars: number
  maxCodebaseHits: number
  shortSystemPrompt: boolean
}

const PRESETS: Record<'small' | 'balanced' | 'large', Omit<PromptBudget, 'tier'>> = {
  small: {
    label: 'Small (≈7–8B)',
    maxTotalChars: 14_000,
    maxAttachmentBlockChars: 4_000,
    maxExtractedChars: 8_000,
    maxLineChatFileChars: 12_000,
    maxInlineChars: 6_000,
    maxCodebaseHits: 4,
    shortSystemPrompt: true,
  },
  balanced: {
    label: 'Balanced',
    maxTotalChars: 56_000,
    maxAttachmentBlockChars: 20_000,
    maxExtractedChars: 40_000,
    maxLineChatFileChars: 48_000,
    maxInlineChars: 24_000,
    maxCodebaseHits: 8,
    shortSystemPrompt: false,
  },
  large: {
    label: 'Large context',
    maxTotalChars: 220_000,
    maxAttachmentBlockChars: 100_000,
    maxExtractedChars: 120_000,
    maxLineChatFileChars: 180_000,
    maxInlineChars: 80_000,
    maxCodebaseHits: 12,
    shortSystemPrompt: false,
  },
}

/** Infer small / balanced / large from model id (ollama/lmstudio/openai names). */
export function inferTierFromModelName(modelName: string): 'small' | 'balanced' | 'large' {
  const m = modelName.toLowerCase()

  if (/\b(gpt-4o|gpt-4-turbo|gpt-4\.1|claude-3\.?5|claude-4|gemini-1\.5|gemini-2)\b/i.test(m)) return 'large'
  if (/\b(gpt-3\.5|gpt-4o-mini|claude-3-haiku)\b/i.test(m)) return 'balanced'

  const paramMatch = m.match(/(?:^|[-_:])(\d+(?:\.\d+)?)\s*b\b/i)
  if (paramMatch) {
    const n = parseFloat(paramMatch[1]!)
    if (n <= 9) return 'small'
    if (n <= 22) return 'balanced'
    return 'large'
  }

  if (/\b(7b|8b|3b|2b|1b|0\.5b|tiny|small)\b/i.test(m)) return 'small'
  if (/\b(32b|70b|65b|405b|large|medium)\b/i.test(m)) return 'large'

  return 'balanced'
}

export function resolvePromptBudget(mode: PromptBudgetMode, modelName: string): PromptBudget {
  const tier: 'small' | 'balanced' | 'large' = mode === 'auto' ? inferTierFromModelName(modelName) : mode
  const base = PRESETS[tier]
  return {
    ...base,
    tier,
    label: mode === 'auto' ? `${base.label} (auto → ${tier})` : base.label,
  }
}

export function truncateWithNote(text: string, maxChars: number, noteLabel: string): { text: string; note?: string } {
  if (text.length <= maxChars) return { text }
  const cut = text.slice(0, maxChars)
  return {
    text: `${cut}\n\n[${noteLabel}: truncated ${text.length - maxChars} chars]`,
    note: noteLabel,
  }
}

export function clipPromptBody(full: string, maxTotalChars: number): { text: string; note?: string } {
  if (full.length <= maxTotalChars) return { text: full }
  return truncateWithNote(full, maxTotalChars, 'Prompt budget')
}

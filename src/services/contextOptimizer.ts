/**
 * Smart context optimization for different model sizes.
 * Instead of blindly truncating, we intelligently select what to include.
 */

export type ModelSize = 'tiny' | 'small' | 'medium' | 'large'

export interface ContextBudget {
  modelSize: ModelSize
  maxPromptChars: number
  maxFileChars: number
  maxCodebaseHits: number
  prioritizeErrorLines: boolean
  includeFullFile: boolean
  minRelevanceScore: number
}

export const CONTEXT_BUDGETS: Record<ModelSize, ContextBudget> = {
  tiny: {
    modelSize: 'tiny',
    maxPromptChars: 6_000, // ~1.5K tokens
    maxFileChars: 4_000,
    maxCodebaseHits: 2,
    prioritizeErrorLines: true,
    includeFullFile: false,
    minRelevanceScore: 0.7,
  },
  small: {
    modelSize: 'small',
    maxPromptChars: 14_000, // ~3.5K tokens
    maxFileChars: 8_000,
    maxCodebaseHits: 4,
    prioritizeErrorLines: true,
    includeFullFile: false,
    minRelevanceScore: 0.5,
  },
  medium: {
    modelSize: 'medium',
    maxPromptChars: 56_000, // ~14K tokens
    maxFileChars: 40_000,
    maxCodebaseHits: 8,
    prioritizeErrorLines: false,
    includeFullFile: true,
    minRelevanceScore: 0.3,
  },
  large: {
    modelSize: 'large',
    maxPromptChars: 220_000, // ~55K tokens
    maxFileChars: 120_000,
    maxCodebaseHits: 12,
    prioritizeErrorLines: false,
    includeFullFile: true,
    minRelevanceScore: 0.1,
  },
}

/**
 * Detect model size from model name
 */
export function detectModelSize(modelName: string): ModelSize {
  const m = modelName.toLowerCase()

  // Very large models
  if (/\b(gpt-4o|gpt-4-turbo|gpt-4\.1|claude-3\.?5|claude-4|gemini-2|llama-3-70b)\b/i.test(m)) {
    return 'large'
  }

  // Medium models
  if (/\b(gpt-3\.5|gpt-4o-mini|claude-3-haiku|llama-2-70b|llama-3-8b|qwen-72b|mixtral)\b/i.test(m)) {
    return 'medium'
  }

  // Parse parameter count
  const paramMatch = m.match(/(?:^|[-_:])(\d+(?:\.\d+)?)\s*b\b/i)
  if (paramMatch) {
    const n = parseFloat(paramMatch[1]!)
    if (n <= 3) return 'tiny'
    if (n <= 9) return 'small'
    if (n <= 22) return 'medium'
    return 'large'
  }

  // Heuristic keywords
  if (/\b(3b|2b|1b|0\.5b|tiny|nano)\b/i.test(m)) return 'tiny'
  if (/\b(7b|8b|small)\b/i.test(m)) return 'small'
  if (/\b(32b|70b|65b|large|405b)\b/i.test(m)) return 'large'

  return 'medium' // default
}

/**
 * Extract code blocks from a passage, maintaining line context for errors
 */
export function extractRelevantCodeBlocks(
  text: string,
  keywords: string[],
  includeErrors: boolean = true,
): string[] {
  const blocks: string[] = []
  const lines = text.split('\n')
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i')

  let currentBlock: string[] = []
  let blockStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const isRelevant = keywordPattern.test(line)
    const isError =
      includeErrors && /\b(error|warning|bug|fix|broken|issue|fail|exception)\b/i.test(line)
    const isCodeLine = /^\s*(const|let|var|function|class|export|import|return|if|for|while|async|await)/.test(
      line,
    )

    if (isRelevant || isError || isCodeLine) {
      if (currentBlock.length === 0) blockStart = Math.max(0, i - 2)
      currentBlock.push(line)
    } else if (currentBlock.length > 0 && line.trim() === '') {
      // Empty line within block
      currentBlock.push(line)
    } else if (currentBlock.length > 0) {
      // End of block
      blocks.push(currentBlock.slice(0, -1).join('\n'))
      currentBlock = []
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'))
  }

  return blocks
}

/**
 * Smart truncation: keeps important lines, removes middle bulk
 */
export function smartTruncate(text: string, maxChars: number, keepErrors: boolean = true): string {
  if (text.length <= maxChars) return text

  const lines = text.split('\n')

  // Score lines by importance
  const scored = lines.map((line, idx) => {
    let score = 0

    // Error/warning lines are critical
    if (keepErrors && /\b(error|warning|TODO|FIXME|BUG)\b/i.test(line)) score += 100

    // Comments and docstrings
    if (/^\s*(\/\/|\/\*|\*|#|\"\"\"|\'\'\')/.test(line)) score += 5

    // Function/class definitions
    if (/^\s*(function|class|export|const.*=>|async)/.test(line)) score += 50

    // Import/export
    if (/^\s*(import|export)/.test(line)) score += 30

    // First and last lines of blocks
    if (idx === 0 || idx === lines.length - 1) score += 20

    return { line, score, idx }
  })

  // Keep high-scoring lines, estimate char usage
  const importantLines = scored.filter((s) => s.score > 10)
  let result = importantLines.map((s) => s.line).join('\n')

  if (result.length > maxChars) {
    // Still too long, keep ONLY errors and function defs
    const critical = scored.filter((s) => s.score >= 50)
    result = critical.map((s) => s.line).join('\n')
  }

  if (result.length > maxChars) {
    // Last resort: naive truncation
    result = result.slice(0, maxChars) + '\n[... truncated]'
  }

  return result
}

/**
 * Optimize full context for a specific model
 */
export function optimizeContextForModel(
  fullPrompt: string,
  userQuery: string,
  budget: ContextBudget,
): { optimized: string; truncated: boolean; notes: string[] } {
  const notes: string[] = []

  if (fullPrompt.length <= budget.maxPromptChars) {
    return { optimized: fullPrompt, truncated: false, notes }
  }

  // Extract keywords from user query
  const keywords = userQuery
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[^a-z0-9_]/gi, ''))

  // Try smart extraction first
  const blocks = extractRelevantCodeBlocks(fullPrompt, keywords, budget.prioritizeErrorLines)
  let result = blocks.join('\n\n')

  if (result.length > budget.maxPromptChars) {
    // Smart truncation if still too long
    result = smartTruncate(result, budget.maxPromptChars, budget.prioritizeErrorLines)
    notes.push('Context optimized: kept error lines and function definitions')
  } else {
    notes.push('Context optimized: extracted relevant code blocks')
  }

  return {
    optimized: result,
    truncated: result.length < fullPrompt.length,
    notes,
  }
}

/**
 * Calculate effective token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Get budget for a model
 */
export function getBudgetForModel(modelName: string, override?: ModelSize): ContextBudget {
  const size = override || detectModelSize(modelName)
  return CONTEXT_BUDGETS[size]
}

// intent parser per optimization spec section 3
// hybrid approach: fast rule-based + fallback to small model

export type Intent =
  | { type: 'explain'; target?: string; code?: string }
  | { type: 'fix'; file?: string; error?: string; line?: number }
  | { type: 'generate'; scope: 'file' | 'project'; description: string }
  | { type: 'agent'; task: string }
  | { type: 'ask'; question: string }

// keywords for fast rule-based detection
const INTENT_KEYWORDS: Record<string, string[]> = {
  fix: ['fix', 'repair', 'correct', 'bug', 'error', 'broken', 'not working', 'fails'],
  explain: ['explain', 'what does', 'how does', 'why', 'what is', 'describe'],
  generate: ['create', 'generate', 'write', 'add', 'implement', 'build'],
  agent: ['agent', 'plan', 'steps', 'refactor', 'architecture', 'restructure']
}

// fast rule-based intent detection
function ruleBasedParse(input: string): Intent | null {
  const lower = input.toLowerCase().trim()

  // check for fix intent
  if (INTENT_KEYWORDS.fix.some(kw => lower.includes(kw))) {
    const lineMatch = lower.match(/line\s*(\d+)/)
    const fileMatch = lower.match(/@(\S+)/)
    return {
      type: 'fix',
      file: fileMatch ? fileMatch[1] : undefined,
      line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      error: extractErrorContext(lower)
    }
  }

  // check for explain intent
  if (INTENT_KEYWORDS.explain.some(kw => lower.startsWith(kw) || lower.includes(kw))) {
    return {
      type: 'explain',
      target: extractTarget(lower)
    }
  }

  // check for generate intent
  if (INTENT_KEYWORDS.generate.some(kw => lower.includes(kw))) {
    const scope = lower.includes('project') || lower.includes('all') ? 'project' : 'file'
    return {
      type: 'generate',
      scope,
      description: input
    }
  }

  // check for agent intent
  if (INTENT_KEYWORDS.agent.some(kw => lower.includes(kw))) {
    return {
      type: 'agent',
      task: input
    }
  }

  return null
}

function extractErrorContext(input: string): string | undefined {
  // extract error message after common markers
  const errorPatterns = [
    /error[:\s]+(.+?)(?:\.|\n|$)/i,
    /exception[:\s]+(.+?)(?:\.|\n|$)/i,
    /fails?[:\s]+(.+?)(?:\.|\n|$)/i
  ]

  for (const pattern of errorPatterns) {
    const match = input.match(pattern)
    if (match) return match[1].trim()
  }

  return undefined
}

function extractTarget(input: string): string | undefined {
  // extract target after explain keywords
  const patterns = [
    /explain\s+(?:me\s+)?(?:this|the\s+following)?[:\s]*(.+?)(?:\.|\n|$)/i,
    /what\s+is\s+(.+?)(?:\.|\n|$)/i,
    /what\s+does\s+(.+?)\s+do/i,
    /how\s+does\s+(.+?)\s+work/i
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1].trim()
  }

  return undefined
}

// fallback to small model for complex inputs
async function modelBasedParse(input: string, model: { generate: (prompt: string) => Promise<string> }): Promise<Intent> {
  const prompt = `classify the following user request into one of these categories:
- explain: user wants to understand code
- fix: user wants to fix a bug or error
- generate: user wants to create new code
- agent: user wants a complex multi-step task
- ask: user has a general question

user request: "${input}"

respond with exactly one word: explain, fix, generate, agent, or ask.`

  const response = await model.generate(prompt)
  const type = response.trim().toLowerCase().split(/\s+/)[0] as Intent['type']

  switch (type) {
    case 'explain':
      return { type: 'explain', target: input }
    case 'fix':
      return { type: 'fix', error: input }
    case 'generate':
      return { type: 'generate', scope: 'file', description: input }
    case 'agent':
      return { type: 'agent', task: input }
    default:
      return { type: 'ask', question: input }
  }
}

// main intent parser function per spec section 3.4
export async function parseIntent(
  input: string,
  smallModel?: { generate: (prompt: string) => Promise<string> }
): Promise<Intent> {
  // step 1: try fast rule-based detection
  const ruleBased = ruleBasedParse(input)
  if (ruleBased) {
    return ruleBased
  }

  // step 2: fallback to small model if available
  if (smallModel) {
    return await modelBasedParse(input, smallModel)
  }

  // step 3: default to ask intent
  return { type: 'ask', question: input }
}

// sync version for simple cases
export function parseIntentSync(input: string): Intent {
  return ruleBasedParse(input) || { type: 'ask', question: input }
}

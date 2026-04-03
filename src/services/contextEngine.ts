// context engine per optimization spec section 4
// provides only relevant data to the model with token budgeting

export interface ContextFile {
  path: string
  content: string
  relevance: number // 0-1 score
  compressed?: boolean
}

export interface ContextBudget {
  maxTokens: number
  usedTokens: number
  availableTokens: number
}

// token estimation: ~4 chars per token for code
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// compress file by removing comments and empty lines per spec section 4.6
export function compressFile(content: string, language?: string): string {
  let compressed = content

  // remove single-line comments
  if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'c' || language === 'cpp') {
    compressed = compressed.replace(/\/\/.*$/gm, '')
    compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  if (language === 'python') {
    compressed = compressed.replace(/#.*$/gm, '')
    compressed = compressed.replace(/'''[\s\S]*?'''/g, '')
    compressed = compressed.replace(/"""[\s\S]*?"""/g, '')
  }

  // remove extra whitespace
  compressed = compressed.replace(/\n{3,}/g, '\n\n')
  compressed = compressed.replace(/[ \t]+$/gm, '')

  return compressed.trim()
}

// keep only function signatures for large files
export function extractSignatures(content: string, language?: string): string {
  const lines = content.split('\n')
  const signatures: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // match function signatures
    if (language === 'typescript' || language === 'javascript') {
      if (/^(export\s+)?(async\s+)?function\s+\w+\s*\(/.test(line) ||
          /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\(/.test(line) ||
          /^(export\s+)?class\s+\w+/.test(line)) {
        signatures.push(line.trim())
      }
    }

    if (language === 'python') {
      if (/^(async\s+)?def\s+\w+\s*\(/.test(line) ||
          /^class\s+\w+/.test(line)) {
        signatures.push(line.trim())
      }
    }
  }

  return signatures.join('\n')
}

// select files based on query relevance per spec section 4.4
function selectRelevantFiles(
  files: ContextFile[],
  query: string,
  maxFiles: number
): ContextFile[] {
  const queryTerms = query.toLowerCase().split(/\s+/)

  // score each file
  const scored = files.map(file => {
    const nameScore = queryTerms.some(term => file.path.toLowerCase().includes(term)) ? 0.5 : 0
    const contentScore = queryTerms.some(term => file.content.toLowerCase().includes(term)) ? 0.3 : 0
    const relevance = nameScore + contentScore + file.relevance
    return { ...file, relevance }
  })

  // sort by relevance and take top files
  return scored
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxFiles)
}

// build context within token budget per spec section 4.5
export function buildContext(
  files: ContextFile[],
  query: string,
  budget: ContextBudget,
  modelSize: 'small' | 'large'
): { files: ContextFile[]; budget: ContextBudget; truncated: boolean } {
  const maxFiles = modelSize === 'small' ? 3 : 8
  const relevantFiles = selectRelevantFiles(files, query, maxFiles)

  const result: ContextFile[] = []
  let usedTokens = 0
  let truncated = false

  for (const file of relevantFiles) {
    let content = file.content
    let isCompressed = false

    // estimate tokens
    let tokens = estimateTokens(content)

    // if file is too large, compress it
    if (tokens > budget.availableTokens * 0.3) {
      const ext = file.path.split('.').pop()
      content = compressFile(content, ext)
      tokens = estimateTokens(content)
      isCompressed = true
    }

    // if still too large, extract signatures only
    if (tokens > budget.availableTokens * 0.2) {
      const ext = file.path.split('.').pop()
      content = extractSignatures(content, ext)
      tokens = estimateTokens(content)
      isCompressed = true
    }

    // add file if it fits
    if (usedTokens + tokens <= budget.availableTokens) {
      result.push({
        ...file,
        content,
        compressed: isCompressed
      })
      usedTokens += tokens
    } else {
      truncated = true
      break
    }
  }

  return {
    files: result,
    budget: {
      maxTokens: budget.maxTokens,
      usedTokens,
      availableTokens: budget.maxTokens - usedTokens
    },
    truncated
  }
}

// adaptive context based on model size per spec section 4.7
export function getAdaptiveBudget(modelSize: 'small' | 'large'): ContextBudget {
  const maxTokens = modelSize === 'small' ? 4000 : 32000
  return {
    maxTokens,
    usedTokens: 0,
    availableTokens: maxTokens
  }
}

// format context for prompt
export function formatContext(files: ContextFile[]): string {
  if (files.length === 0) return ''

  const formatted = files.map(file => {
    const compressedNote = file.compressed ? ' (compressed)' : ''
    return `--- ${file.path}${compressedNote} ---\n${file.content}\n`
  })

  return `\n[context]\n${formatted.join('\n')}\n`
}

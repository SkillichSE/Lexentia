// post processor per optimization spec section 8
// clean and structure model output

export interface FileChange {
  path: string
  original?: string
  modified: string
  type: 'create' | 'modify' | 'delete'
}

// clean output: trim, remove extra formatting per spec section 8.2
export function cleanOutput(text: string): string {
  let cleaned = text.trim()

  // remove markdown code block markers if present
  cleaned = cleaned.replace(/^```\w*\n?/, '')
  cleaned = cleaned.replace(/\n?```$/, '')

  // remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n')

  // remove multiple consecutive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

// parse diff output per spec section 8.3
export function parseDiff(output: string): FileChange[] {
  const changes: FileChange[] = []

  // look for diff format: --- a/file +++ b/file
  const diffPattern = /---\s+(?:a\/|\b)(.+?)\n\+\+\+\s+(?:b\/|\b)(.+?)\n([\s\S]*?)(?=---\s+(?:a\/|\b)|$)/g

  let match
  while ((match = diffPattern.exec(output)) !== null) {
    const oldPath = match[1].trim()
    const newPath = match[2].trim()
    const diffContent = match[3]

    const type: FileChange['type'] = oldPath === '/dev/null' ? 'create' :
                                     newPath === '/dev/null' ? 'delete' : 'modify'

    // extract modified content from diff
    const lines = diffContent.split('\n')
    const modifiedLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        modifiedLines.push(line.substring(1))
      }
    }

    changes.push({
      path: newPath === '/dev/null' ? oldPath : newPath,
      modified: modifiedLines.join('\n'),
      type
    })
  }

  // fallback: look for file path markers without diff format
  if (changes.length === 0) {
    const filePattern = /(?:file|path)[:\s]+(.+?)\n```\w*\n([\s\S]*?)```/gi
    while ((match = filePattern.exec(output)) !== null) {
      changes.push({
        path: match[1].trim(),
        modified: cleanOutput(match[2]),
        type: 'modify'
      })
    }
  }

  return changes
}

// validate changes per spec section 8.4
export function validateChanges(changes: FileChange[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const change of changes) {
    // check for empty paths
    if (!change.path || change.path.trim() === '') {
      errors.push('change has empty file path')
    }

    // check for suspicious paths (hallucinated)
    if (change.path.includes('undefined') || change.path.includes('null')) {
      errors.push(`suspicious path: ${change.path}`)
    }

    // check for empty modifications on non-delete changes
    if (change.type !== 'delete' && (!change.modified || change.modified.trim() === '')) {
      errors.push(`${change.path}: empty modification`)
    }

    // basic syntax validation for code files
    if (change.path.endsWith('.ts') || change.path.endsWith('.js')) {
      // check for balanced braces
      const openBraces = (change.modified.match(/{/g) || []).length
      const closeBraces = (change.modified.match(/}/g) || []).length
      if (openBraces !== closeBraces) {
        errors.push(`${change.path}: unbalanced braces`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// extract code from model output
export function extractCode(output: string, language?: string): string {
  let code = output

  // try to extract from code blocks
  const codeBlockPattern = new RegExp(`\`\`\`${language || '[\\w]*'}\\n?([\\s\\S]*?)\\n?\`\`\``)
  const match = output.match(codeBlockPattern)
  if (match) {
    code = match[1]
  }

  return cleanOutput(code)
}

// apply changes to original content
export function applyChange(original: string, change: FileChange): string {
  if (change.type === 'create') return change.modified
  if (change.type === 'delete') return ''

  // for modify, attempt to apply diff
  if (change.original) {
    return original.replace(change.original, change.modified)
  }

  // fallback: return modified content
  return change.modified
}

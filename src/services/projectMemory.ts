// project memory system per spec section 7
import { useState, useEffect, useCallback } from 'react'

export interface ProjectRules {
  language: string
  rules: string[]
  learnedPatterns: string[]
  lastUpdated: number
}

const DEFAULT_RULES: ProjectRules = {
  language: 'typescript',
  rules: [
    'use functional components',
    'avoid any type'
  ],
  learnedPatterns: [],
  lastUpdated: Date.now()
}

const RULES_FILE = '.lexentia/project_rules.json'

// load project rules from disk
export async function loadProjectRules(workspaceRoot: string | null): Promise<ProjectRules> {
  if (!workspaceRoot) return DEFAULT_RULES

  try {
    const result = await window.lexentia.fs.readFile(`${workspaceRoot}/${RULES_FILE}`)
    if (result.ok && result.content) {
      return JSON.parse(result.content)
    }
  } catch {
    // file doesn't exist, return defaults
  }
  return DEFAULT_RULES
}

// save project rules to disk
export async function saveProjectRules(workspaceRoot: string | null, rules: ProjectRules): Promise<boolean> {
  if (!workspaceRoot) return false

  try {
    // ensure .lexentia directory exists
    await window.lexentia.fs.writeFile(`${workspaceRoot}/${RULES_FILE}`, JSON.stringify(rules, null, 2))
    return true
  } catch (error) {
    console.error('failed to save project rules:', error)
    return false
  }
}

// detect patterns from codebase per spec section 7.4
export async function learnFromCodebase(
  workspaceRoot: string | null,
  indexedFiles: string[]
): Promise<string[]> {
  if (!workspaceRoot || indexedFiles.length === 0) return []

  const patterns: string[] = []

  // analyze file extensions
  const extensions = new Set(indexedFiles.map(f => f.split('.').pop()?.toLowerCase()).filter(Boolean))
  if (extensions.has('ts') || extensions.has('tsx')) {
    patterns.push('typescript codebase detected')
  }
  if (extensions.has('py')) {
    patterns.push('python codebase detected')
  }

  // sample files for patterns
  const sampleFiles = indexedFiles.slice(0, 10)
  for (const file of sampleFiles) {
    try {
      const result = await window.lexentia.fs.readFile(file)
      if (result.ok && result.content) {
        // detect common patterns
        if (/export\s+function|export\s+const|export\s+class/.test(result.content)) {
          patterns.push('es6 module pattern detected')
        }
        if (/interface\s+\w+|type\s+\w+\s*=/.test(result.content)) {
          patterns.push('typescript types usage detected')
        }
        if (/describe\(|it\(|test\(/.test(result.content)) {
          patterns.push('testing framework detected')
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return [...new Set(patterns)]
}

// hook for project memory
export function useProjectMemory(workspaceRoot: string | null) {
  const [rules, setRules] = useState<ProjectRules>(DEFAULT_RULES)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    loadProjectRules(workspaceRoot)
      .then(setRules)
      .finally(() => setIsLoading(false))
  }, [workspaceRoot])

  const updateRules = useCallback(async (updates: Partial<ProjectRules>) => {
    const newRules = { ...rules, ...updates, lastUpdated: Date.now() }
    const saved = await saveProjectRules(workspaceRoot, newRules)
    if (saved) {
      setRules(newRules)
    }
    return saved
  }, [rules, workspaceRoot])

  const addRule = useCallback(async (rule: string) => {
    return updateRules({ rules: [...rules.rules, rule] })
  }, [rules, updateRules])

  const removeRule = useCallback(async (index: number) => {
    const newRules = [...rules.rules]
    newRules.splice(index, 1)
    return updateRules({ rules: newRules })
  }, [rules, updateRules])

  const learnPatterns = useCallback(async (indexedFiles: string[]) => {
    const patterns = await learnFromCodebase(workspaceRoot, indexedFiles)
    return updateRules({ learnedPatterns: [...rules.learnedPatterns, ...patterns] })
  }, [rules, workspaceRoot, updateRules])

  const getRulesForPrompt = useCallback((): string => {
    const allRules = [...rules.rules, ...rules.learnedPatterns]
    if (allRules.length === 0) return ''
    return `\n[project rules]\nlanguage: ${rules.language}\n${allRules.map(r => `- ${r}`).join('\n')}\n`
  }, [rules])

  return {
    rules,
    isLoading,
    updateRules,
    addRule,
    removeRule,
    learnPatterns,
    getRulesForPrompt
  }
}

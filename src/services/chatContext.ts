import { simpleCodebaseSearch } from './workspaceIndex'

// builds extra user-visible context (local only; stays in prompt to your endpoint)

export function autoEditorContext(opts: {
  openTabPaths: string[]
  activeRelPath: string | null
  cursor: { line: number; col: number }
}): string {
  const tabs = opts.openTabPaths.length ? opts.openTabPaths.join(', ') : 'none'
  const active = opts.activeRelPath ?? 'none'
  return `[editor context — local]\nopen files: ${tabs}\nactive: ${active} @ L${opts.cursor.line}:C${opts.cursor.col}\n`
}

export function expandMentions(
  text: string,
  opts: {
    indexedFiles: string[]
    snippets: Map<string, string>
    workspaceRoot: string | null
    /** @default 8 */
    maxCodebaseHits?: number
  },
): { augmented: string; notes: string[] } {
  const notes: string[] = []
  let out = text
  const maxHits = opts.maxCodebaseHits ?? 8

  if (/@codebase\b/i.test(text)) {
    const q = text.replace(/@codebase\b/gi, '').trim()
    const hits = simpleCodebaseSearch(q || ' ', opts.indexedFiles, opts.snippets, maxHits)
    const block =
      hits.length > 0
        ? `\n[@codebase matches — local keyword scan]\n${hits.map((h) => `- ${h}`).join('\n')}\n`
        : '\n[@codebase — no keyword matches in indexed files]\n'
    out += block
    notes.push('codebase keyword scan (vector index not wired yet)')
  }

  if (/@folder\s+(\S+)/i.test(text)) {
    notes.push('@folder: attach subtree listing is not implemented yet; only paths are listed in explorer.')
  }

  if (/@docs\b/i.test(text)) {
    notes.push('@docs: external docs fetch is disabled by default for privacy.')
  }

  return { augmented: out, notes }
}

// Enhanced @mention system for RAG and context
import { ragIndexer, type SearchResult } from './ragIndex'
import { simpleCodebaseSearch } from './workspaceIndex'

export interface MentionContext {
  workspaceRoot: string | null
  indexedFiles: string[]
  snippets: Map<string, string>
  openTabs: string[]
  activeFile: string | null
  cursor: { line: number; col: number }
}

export interface MentionResult {
  type: 'file' | 'folder' | 'codebase' | 'terminal' | 'docs' | 'function' | 'class' | 'definition'
  content: string
  context?: string
  metadata?: Record<string, any>
}

export interface ParsedMentions {
  original: string
  processed: string
  results: MentionResult[]
  notes: string[]
}

// Enhanced mention parser with more sophisticated patterns
export class MentionParser {
  private context: MentionContext
  
  constructor(context: MentionContext) {
    this.context = context
  }
  
  async parse(text: string): Promise<ParsedMentions> {
    const results: MentionResult[] = []
    const notes: string[] = []
    let processed = text
    
    // Pattern for @file:path or @file filename
    const filePattern = /@file\s+([^\s]+)/g
    let match
    
    while ((match = filePattern.exec(text)) !== null) {
      const fileRef = match[1]
      const fileResult = await this.handleFileMention(fileRef)
      if (fileResult) {
        results.push(fileResult)
        processed = processed.replace(match[0], fileResult.content)
      }
    }
    
    // Pattern for @folder:path
    const folderPattern = /@folder\s+([^\s]+)/g
    while ((match = folderPattern.exec(text)) !== null) {
      const folderRef = match[1]
      const folderResult = await this.handleFolderMention(folderRef)
      if (folderResult) {
        results.push(folderResult)
        processed = processed.replace(match[0], folderResult.content)
      }
    }
    
    // Pattern for @codebase query
    const codebasePattern = /@codebase\s*(.+)?/g
    while ((match = codebasePattern.exec(text)) !== null) {
      const query = match[1]?.trim() || ''
      const codebaseResult = await this.handleCodebaseMention(query)
      if (codebaseResult) {
        results.push(codebaseResult)
        processed = processed.replace(match[0], codebaseResult.content)
      }
    }
    
    // Pattern for @terminal [command]
    const terminalPattern = /@terminal\s*(.+)?/g
    while ((match = terminalPattern.exec(text)) !== null) {
      const command = match[1]?.trim() || ''
      const terminalResult = await this.handleTerminalMention(command)
      if (terminalResult) {
        results.push(terminalResult)
        processed = processed.replace(match[0], terminalResult.content)
      }
    }
    
    // Pattern for @function:name
    const functionPattern = /@function\s+([^\s]+)/g
    while ((match = functionPattern.exec(text)) !== null) {
      const functionName = match[1]
      const functionResult = await this.handleFunctionMention(functionName)
      if (functionResult) {
        results.push(functionResult)
        processed = processed.replace(match[0], functionResult.content)
      }
    }
    
    // Pattern for @class:name
    const classPattern = /@class\s+([^\s]+)/g
    while ((match = classPattern.exec(text)) !== null) {
      const className = match[1]
      const classResult = await this.handleClassMention(className)
      if (classResult) {
        results.push(classResult)
        processed = processed.replace(match[0], classResult.content)
      }
    }
    
    // Pattern for @definition:symbol
    const definitionPattern = /@definition\s+([^\s]+)/g
    while ((match = definitionPattern.exec(text)) !== null) {
      const symbol = match[1]
      const definitionResult = await this.handleDefinitionMention(symbol)
      if (definitionResult) {
        results.push(definitionResult)
        processed = processed.replace(match[0], definitionResult.content)
      }
    }
    
    // Pattern for @docs query
    const docsPattern = /@docs\s*(.+)?/g
    while ((match = docsPattern.exec(text)) !== null) {
      const query = match[1]?.trim() || ''
      notes.push('@docs: External documentation search not implemented yet')
    }
    
    return { original: text, processed, results, notes }
  }
  
  private async handleFileMention(fileRef: string): Promise<MentionResult | null> {
    // Try to find the file in workspace
    let targetFile = fileRef
    
    // If not a full path, try to find it
    if (!fileRef.includes('/')) {
      const matches = this.context.indexedFiles.filter(f => 
        f.endsWith(fileRef) || f.endsWith(`/${fileRef}`)
      )
      if (matches.length > 0) {
        targetFile = matches[0]
      }
    }
    
    const content = this.context.snippets.get(targetFile)
    if (content) {
      return {
        type: 'file',
        content: `\n[@file:${targetFile}]\n${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}\n`,
        context: targetFile
      }
    }
    
    return null
  }
  
  private async handleFolderMention(folderRef: string): Promise<MentionResult | null> {
    // List files in folder
    const folderFiles = this.context.indexedFiles.filter(f => 
      f.startsWith(folderRef) || f.includes(`/${folderRef}/`)
    )
    
    if (folderFiles.length > 0) {
      const fileList = folderFiles.slice(0, 20).map(f => `  ${f}`).join('\n')
      const more = folderFiles.length > 20 ? `\n  ... and ${folderFiles.length - 20} more files` : ''
      
      return {
        type: 'folder',
        content: `\n[@folder:${folderRef}]\n${fileList}${more}\n`,
        context: folderRef,
        metadata: { fileCount: folderFiles.length }
      }
    }
    
    return null
  }
  
  private async handleCodebaseMention(query: string): Promise<MentionResult | null> {
    try {
      // Use hybrid search (semantic + keyword)
      const results = await ragIndexer.hybridSearch(
        query, 
        this.context.indexedFiles, 
        this.context.snippets
      )
      
      if (results.length > 0) {
        const searchResults = results.map(r => 
          `- ${r.chunk.filePath}:${r.chunk.startLine}-${r.chunk.endLine} (score: ${r.score.toFixed(2)})\n${r.context}`
        ).join('\n\n')
        
        return {
          type: 'codebase',
          content: `\n[@codebase:${query} — hybrid search]\n${searchResults}\n`,
          metadata: { resultCount: results.length, query }
        }
      } else {
        return {
          type: 'codebase',
          content: `\n[@codebase:${query} — no matches found]\n`,
          metadata: { resultCount: 0, query }
        }
      }
    } catch (error) {
      return {
        type: 'codebase',
        content: `\n[@codebase:${query} — search error: ${error}]\n`,
        metadata: { error: String(error), query }
      }
    }
  }
  
  private async handleTerminalMention(command: string): Promise<MentionResult | null> {
    // This would integrate with terminal history/output
    // For now, return a placeholder
    return {
      type: 'terminal',
      content: `\n[@terminal:${command}]\nTerminal integration not yet implemented\n`,
      metadata: { command }
    }
  }
  
  private async handleFunctionMention(functionName: string): Promise<MentionResult | null> {
    try {
      const results = await ragIndexer.semanticSearch(`function ${functionName}`, 5)
      const functionMatches = results.filter(r => 
        r.chunk.metadata.functions.includes(functionName)
      )
      
      if (functionMatches.length > 0) {
        const functionDefs = functionMatches.map(r => 
          `${r.chunk.filePath}:${r.chunk.startLine}\n${r.chunk.content}`
        ).join('\n\n')
        
        return {
          type: 'function',
          content: `\n[@function:${functionName}]\n${functionDefs}\n`,
          metadata: { functionName, matchCount: functionMatches.length }
        }
      }
    } catch (error) {
      // Fallback to keyword search
    }
    
    return {
      type: 'function',
      content: `\n[@function:${functionName} — not found]\n`,
      metadata: { functionName }
    }
  }
  
  private async handleClassMention(className: string): Promise<MentionResult | null> {
    try {
      const results = await ragIndexer.semanticSearch(`class ${className}`, 5)
      const classMatches = results.filter(r => 
        r.chunk.metadata.classes.includes(className)
      )
      
      if (classMatches.length > 0) {
        const classDefs = classMatches.map(r => 
          `${r.chunk.filePath}:${r.chunk.startLine}\n${r.chunk.content}`
        ).join('\n\n')
        
        return {
          type: 'class',
          content: `\n[@class:${className}]\n${classDefs}\n`,
          metadata: { className, matchCount: classMatches.length }
        }
      }
    } catch (error) {
      // Fallback to keyword search
    }
    
    return {
      type: 'class',
      content: `\n[@class:${className} — not found]\n`,
      metadata: { className }
    }
  }
  
  private async handleDefinitionMention(symbol: string): Promise<MentionResult | null> {
    // Search for any definition of the symbol (function, class, variable, etc.)
    try {
      const results = await ragIndexer.semanticSearch(symbol, 10)
      
      // Filter for relevant definitions
      const definitions = results.filter(r => 
        r.chunk.metadata.functions.includes(symbol) ||
        r.chunk.metadata.classes.includes(symbol) ||
        new RegExp(`(?:const|let|var|interface|type)\\s+${symbol}\\b`).test(r.chunk.content)
      )
      
      if (definitions.length > 0) {
        const defs = definitions.map(r => 
          `${r.chunk.filePath}:${r.chunk.startLine}\n${r.chunk.content}`
        ).join('\n\n')
        
        return {
          type: 'definition',
          content: `\n[@definition:${symbol}]\n${defs}\n`,
          metadata: { symbol, matchCount: definitions.length }
        }
      }
    } catch (error) {
      // Fallback
    }
    
    return {
      type: 'definition',
      content: `\n[@definition:${symbol} — not found]\n`,
      metadata: { symbol }
    }
  }
}

// Enhanced context builder
export function buildEnhancedContext(opts: {
  openTabs: string[]
  activeFile: string | null
  cursor: { line: number; col: number }
  workspaceRoot: string | null
  indexedFiles: string[]
  snippets: Map<string, string>
}): string {
  const tabs = opts.openTabs.length ? opts.openTabs.join(', ') : 'none'
  const active = opts.activeFile ?? 'none'
  
  let context = `[enhanced editor context — local]\n`
  context += `open files: ${tabs}\n`
  context += `active: ${active} @ L${opts.cursor.line}:C${opts.cursor.col}\n`
  context += `workspace root: ${opts.workspaceRoot || 'none'}\n`
  context += `indexed files: ${opts.indexedFiles.length}\n`
  
  // Add current line context if active file is open
  if (opts.activeFile) {
    const content = opts.snippets.get(opts.activeFile)
    if (content) {
      const lines = content.split('\n')
      const currentLine = lines[opts.cursor.line] || ''
      const nearbyLines = lines
        .slice(Math.max(0, opts.cursor.line - 2), opts.cursor.line + 3)
        .map((line, i) => `${opts.cursor.line - 2 + i + 1}: ${line}`)
        .join('\n')
      
      context += `\n[current context]\n${nearbyLines}\n`
    }
  }
  
  context += '\n'
  return context
}

// Main function to process mentions in chat
export async function processMentions(
  text: string,
  context: MentionContext
): Promise<{ augmented: string; results: MentionResult[]; notes: string[] }> {
  const parser = new MentionParser(context)
  const parsed = await parser.parse(text)
  
  // Add editor context at the beginning
  const editorContext = buildEnhancedContext(context)
  const augmented = editorContext + parsed.processed
  
  return {
    augmented,
    results: parsed.results,
    notes: parsed.notes
  }
}

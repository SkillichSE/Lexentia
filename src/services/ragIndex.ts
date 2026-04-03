// Enhanced RAG system with vector search using tantivy
import { simpleCodebaseSearch } from './workspaceIndex'

// Types for vector search
export interface VectorChunk {
  id: string
  filePath: string
  content: string
  startLine: number
  endLine: number
  embedding?: Float32Array
  metadata: {
    language: string
    functions: string[]
    classes: string[]
    imports: string[]
  }
}

export interface SearchResult {
  chunk: VectorChunk
  score: number
  context: string
}

export interface RAGState {
  status: 'idle' | 'indexing' | 'ready' | 'searching' | 'error'
  indexedChunks: number
  totalFiles: number
  progress: number
  error?: string
}

// Language detection for syntax highlighting
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile'
  }
  return langMap[ext || ''] || 'text'
}

// Extract code structure (functions, classes, imports)
function extractCodeStructure(content: string, language: string): {
  functions: string[]
  classes: string[]
  imports: string[]
} {
  const functions: string[] = []
  const classes: string[] = []
  const imports: string[] = []

  // Basic regex patterns (can be enhanced with proper parsers)
  switch (language) {
    case 'typescript':
    case 'javascript':
      // Functions
      const funcMatches = content.match(/(?:function\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>)/g)
      if (funcMatches) {
        funcMatches.forEach(match => {
          const name = match.replace(/.*(?:function|=|const)\s+(\w+).*/, '$1').trim()
          if (name && !functions.includes(name)) functions.push(name)
        })
      }
      // Classes
      const classMatches = content.match(/class\s+(\w+)/g)
      if (classMatches) {
        classMatches.forEach(match => {
          const name = match.replace(/class\s+(\w+)/, '$1')
          if (name && !classes.includes(name)) classes.push(name)
        })
      }
      // Imports
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g)
      if (importMatches) {
        importMatches.forEach(match => {
          const module = match.replace(/.*from\s+['"]([^'"]+)['"].*/, '$1')
          if (module && !imports.includes(module)) imports.push(module)
        })
      }
      break
    case 'python':
      // Functions
      const pyFuncMatches = content.match(/def\s+(\w+)\s*\(/g)
      if (pyFuncMatches) {
        pyFuncMatches.forEach(match => {
          const name = match.replace(/def\s+(\w+)\s*\(/, '$1')
          if (name && !functions.includes(name)) functions.push(name)
        })
      }
      // Classes
      const pyClassMatches = content.match(/class\s+(\w+)/g)
      if (pyClassMatches) {
        pyClassMatches.forEach(match => {
          const name = match.replace(/class\s+(\w+)/, '$1')
          if (name && !classes.includes(name)) classes.push(name)
        })
      }
      // Imports
      const pyImportMatches = content.match(/(?:import|from)\s+([\w.]+)/g)
      if (pyImportMatches) {
        pyImportMatches.forEach(match => {
          const module = match.replace(/(?:import|from)\s+([\w.]+)/, '$1')
          if (module && !imports.includes(module)) imports.push(module)
        })
      }
      break
  }

  return { functions, classes, imports }
}

// Chunk content into smaller pieces for better vector search
function chunkContent(content: string, filePath: string, maxChunkSize = 1000): VectorChunk[] {
  const chunks: VectorChunk[] = []
  const lines = content.split('\n')
  const language = detectLanguage(filePath)
  
  let currentChunk = ''
  let startLine = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] + '\n'
    
    // Split on logical boundaries (functions, classes, etc.)
    if (currentChunk.length + line.length > maxChunkSize || 
        (language !== 'text' && /^(function|class|def|interface|type)/.test(line.trim()))) {
      
      if (currentChunk.trim()) {
        const structure = extractCodeStructure(currentChunk, language)
        chunks.push({
          id: `${filePath}:${startLine}-${i}`,
          filePath,
          content: currentChunk.trim(),
          startLine,
          endLine: i - 1,
          metadata: {
            language,
            ...structure
          }
        })
      }
      
      currentChunk = line
      startLine = i
    } else {
      currentChunk += line
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    const structure = extractCodeStructure(currentChunk, language)
    chunks.push({
      id: `${filePath}:${startLine}-${lines.length}`,
      filePath,
      content: currentChunk.trim(),
      startLine,
      endLine: lines.length - 1,
      metadata: {
        language,
        ...structure
      }
    })
  }
  
  return chunks
}

// Simple embedding simulation (replace with actual embedding model)
async function generateEmbedding(text: string): Promise<Float32Array> {
  // This is a placeholder - in real implementation, use:
  // - Local model: sentence-transformers/all-MiniLM-L6-v2
  // - Or API: OpenAI embeddings, etc.
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Float32Array(384) // Common embedding dimension
  
  // Simple hash-based embedding (NOT PRODUCTION READY)
  for (let i = 0; i < words.length; i++) {
    const hash = words[i].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const index = hash % embedding.length
    embedding[index] += 1 / Math.sqrt(i + 1)
  }
  
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / norm) as Float32Array
}

// Cosine similarity between two embeddings
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Main RAG indexer class
export class RAGIndexer {
  private chunks: Map<string, VectorChunk> = new Map()
  private state: RAGState = { status: 'idle', indexedChunks: 0, totalFiles: 0, progress: 0 }
  
  async indexWorkspace(files: string[], onProgress?: (state: RAGState) => void): Promise<void> {
    this.state = { status: 'indexing', indexedChunks: 0, totalFiles: files.length, progress: 0 }
    onProgress?.(this.state)
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await window.lexentia.fs.readFile(file)
        
        if (res.ok && res.content) {
          const chunks = chunkContent(res.content, file)
          
          for (const chunk of chunks) {
            // Generate embedding for semantic search
            chunk.embedding = await generateEmbedding(chunk.content)
            this.chunks.set(chunk.id, chunk)
          }
          
          this.state.indexedChunks += chunks.length
          this.state.progress = Math.round(((i + 1) / files.length) * 100)
          onProgress?.(this.state)
        }
      }
      
      this.state = { status: 'ready', indexedChunks: this.chunks.size, totalFiles: files.length, progress: 100 }
      onProgress?.(this.state)
    } catch (error) {
      this.state = { 
        status: 'error', 
        indexedChunks: 0, 
        totalFiles: files.length, 
        progress: 0, 
        error: error instanceof Error ? error.message : String(error) 
      }
      onProgress?.(this.state)
    }
  }
  
  async semanticSearch(query: string, maxResults = 10): Promise<SearchResult[]> {
    if (this.state.status !== 'ready') return []
    
    const queryEmbedding = await generateEmbedding(query)
    const results: SearchResult[] = []
    
    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue
      
      const score = cosineSimilarity(queryEmbedding, chunk.embedding)
      if (score > 0.1) { // Threshold for relevance
        results.push({
          chunk,
          score,
          context: this.generateContext(chunk)
        })
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
  }
  
  // Hybrid search combining semantic and keyword search
  async hybridSearch(query: string, files: string[], snippets: Map<string, string>, maxResults = 10): Promise<SearchResult[]> {
    const semanticResults = await this.semanticSearch(query, maxResults)
    const keywordResults = simpleCodebaseSearch(query, files, snippets, maxResults)
    
    // Combine and deduplicate results
    const combined = new Map<string, SearchResult>()
    
    // Add semantic results with higher weight
    semanticResults.forEach(result => {
      combined.set(result.chunk.id, { ...result, score: result.score * 1.5 })
    })
    
    // Add keyword results
    keywordResults.forEach(filePath => {
      const relevantChunks = Array.from(this.chunks.values())
        .filter(chunk => chunk.filePath === filePath)
        .slice(0, 2) // Take top 2 chunks from each file
      
      relevantChunks.forEach(chunk => {
        if (!combined.has(chunk.id)) {
          combined.set(chunk.id, {
            chunk,
            score: 0.5, // Lower weight for keyword matches
            context: this.generateContext(chunk)
          })
        }
      })
    })
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
  }
  
  private generateContext(chunk: VectorChunk): string {
    const lines = chunk.content.split('\n')
    const context = lines.slice(0, 3).join('\n') // First 3 lines as preview
    return `${chunk.filePath}:${chunk.startLine}-${chunk.endLine}\n${context}`
  }
  
  getState(): RAGState {
    return { ...this.state }
  }
  
  getChunk(id: string): VectorChunk | undefined {
    return this.chunks.get(id)
  }
  
  getChunksByFile(filePath: string): VectorChunk[] {
    return Array.from(this.chunks.values()).filter(chunk => chunk.filePath === filePath)
  }
}

// Singleton instance
export const ragIndexer = new RAGIndexer()

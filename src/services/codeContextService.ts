export type ProjectContext = {
  framework: string[]
  languages: string[]
  dependencies: Record<string, string[]>
  codeStyle: {
    naming: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case'
    quotes: 'single' | 'double'
    semicolons: boolean
    indent: 'spaces' | 'tabs'
    indentSize: number
  }
  architecture: {
    patterns: string[]
    structure: string[]
    conventions: string[]
  }
  testing: {
    frameworks: string[]
    coverage: boolean
    patterns: string[]
  }
  lastAnalyzed: number
}

export type FileContext = {
  path: string
  language: string
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  complexity: number
  dependencies: string[]
  dependents: string[]
}

export class CodeContextService {
  private context: ProjectContext = {
    framework: [],
    languages: [],
    dependencies: {},
    codeStyle: {
      naming: 'camelCase',
      quotes: 'double',
      semicolons: true,
      indent: 'spaces',
      indentSize: 2
    },
    architecture: {
      patterns: [],
      structure: [],
      conventions: []
    },
    testing: {
      frameworks: [],
      coverage: false,
      patterns: []
    },
    lastAnalyzed: 0
  }

  private files: Map<string, FileContext> = new Map()
  private listeners: ((context: ProjectContext) => void)[] = []

  subscribe(listener: (context: ProjectContext) => void) {
    this.listeners.push(listener)
    listener(this.context)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.context }))
  }

  async analyzeProject(files: string[]): Promise<void> {
    console.log('🧠 Analyzing project structure...')
    
    // Reset context
    this.context.framework = []
    this.context.languages = []
    this.context.dependencies = {}
    this.files.clear()

    const fileContents = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await this.readFile(file)
          return { file, content }
        } catch {
          return null
        }
      })
    )

    const validFiles = fileContents.filter(Boolean) as { file: string; content: string }[]

    // Analyze each file
    for (const { file, content } of validFiles) {
      const fileContext = this.analyzeFile(file, content)
      this.files.set(file, fileContext)
      
      // Update project context
      this.updateProjectContext(fileContext)
    }

    // Detect patterns and architecture
    this.detectPatterns(validFiles)
    
    this.context.lastAnalyzed = Date.now()
    this.notifyListeners()
    
    console.log(`✅ Analyzed ${validFiles.length} files`)
    this.printAnalysisSummary()
  }

  private async readFile(path: string): Promise<string> {
    // This would integrate with the file system
    // For now, return empty string
    return ''
  }

  private analyzeFile(path: string, content: string): FileContext {
    const extension = path.split('.').pop()?.toLowerCase()
    const language = this.detectLanguage(extension || '')
    
    const imports = this.extractImports(content, language)
    const exports = this.extractExports(content, language)
    const functions = this.extractFunctions(content, language)
    const classes = this.extractClasses(content, language)
    const complexity = this.calculateComplexity(content)
    const dependencies = this.extractDependencies(content)
    
    return {
      path,
      language,
      imports,
      exports,
      functions,
      classes,
      complexity,
      dependencies,
      dependents: [] // Will be calculated later
    }
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown'
    }
    
    return languageMap[extension] || 'text'
  }

  private extractImports(content: string, language: string): string[] {
    const imports: string[] = []
    
    if (language === 'python') {
      const importRegex = /(?:from\s+(\S+)\s+)?import\s+(.+)/g
      let match
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[0])
      }
    } else if (['javascript', 'typescript'].includes(language)) {
      const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g
      let match
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1])
      }
    }
    
    return imports
  }

  private extractExports(content: string, language: string): string[] {
    const exports: string[] = []
    
    if (['javascript', 'typescript'].includes(language)) {
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g
      let match
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1])
      }
    } else if (language === 'python') {
      // Python doesn't have explicit exports, but we can find public functions/classes
      const functionRegex = /^def\s+(\w+)/gm
      const classRegex = /^class\s+(\w+)/gm
      let match
      
      while ((match = functionRegex.exec(content)) !== null) {
        if (!match[1].startsWith('_')) {
          exports.push(match[1])
        }
      }
      
      while ((match = classRegex.exec(content)) !== null) {
        exports.push(match[1])
      }
    }
    
    return exports
  }

  private extractFunctions(content: string, language: string): string[] {
    const functions: string[] = []
    
    if (['javascript', 'typescript'].includes(language)) {
      const functionRegex = /(?:function\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g
      let match
      while ((match = functionRegex.exec(content)) !== null) {
        functions.push(match[1] || match[2])
      }
    } else if (language === 'python') {
      const functionRegex = /def\s+(\w+)/g
      let match
      while ((match = functionRegex.exec(content)) !== null) {
        functions.push(match[1])
      }
    }
    
    return functions
  }

  private extractClasses(content: string, language: string): string[] {
    const classes: string[] = []
    
    if (['javascript', 'typescript'].includes(language)) {
      const classRegex = /class\s+(\w+)/g
      let match
      while ((match = classRegex.exec(content)) !== null) {
        classes.push(match[1])
      }
    } else if (language === 'python') {
      const classRegex = /class\s+(\w+)/g
      let match
      while ((match = classRegex.exec(content)) !== null) {
        classes.push(match[1])
      }
    }
    
    return classes
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||']
    let complexity = 1 // Base complexity
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = content.match(regex)
      if (matches) {
        complexity += matches.length
      }
    }
    
    return complexity
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = []
    
    // Extract package names from imports
    const packageRegex = /(?:from\s+|import\s+)(['"])(?:(?:@[\w-]+\/)?[\w-]+)(?:\/[^'"]*)?\1/g
    let match
    while ((match = packageRegex.exec(content)) !== null) {
      const packageName = match[0].replace(/(?:from\s+|import\s+)['"]|['"]/g, '').split('/')[0]
      if (packageName && !dependencies.includes(packageName)) {
        dependencies.push(packageName)
      }
    }
    
    return dependencies
  }

  private updateProjectContext(fileContext: FileContext) {
    // Update languages
    if (!this.context.languages.includes(fileContext.language)) {
      this.context.languages.push(fileContext.language)
    }
    
    // Update dependencies
    for (const dep of fileContext.dependencies) {
      if (!this.context.dependencies[fileContext.language]) {
        this.context.dependencies[fileContext.language] = []
      }
      if (!this.context.dependencies[fileContext.language].includes(dep)) {
        this.context.dependencies[fileContext.language].push(dep)
      }
    }
    
    // Detect code style
    this.detectCodeStyle(fileContext)
  }

  private detectCodeStyle(fileContext: FileContext) {
    // This is a simplified detection - in reality would be more sophisticated
    const { path } = fileContext
    
    // Detect naming convention from file names
    if (path.includes('_') && !path.includes('-')) {
      this.context.codeStyle.naming = 'snake_case'
    } else if (path.includes('-') && !path.includes('_')) {
      this.context.codeStyle.naming = 'kebab-case'
    }
  }

  private detectPatterns(files: { file: string; content: string }[]) {
    // Detect frameworks
    const frameworks: string[] = []
    
    for (const { file, content } of files) {
      // React detection
      if (content.includes('import React') || content.includes('from "react"')) {
        frameworks.push('React')
      }
      
      // Django detection
      if (content.includes('from django') || content.includes('django-admin')) {
        frameworks.push('Django')
      }
      
      // Flask detection
      if (content.includes('from flask') || content.includes('Flask(__name__)')) {
        frameworks.push('Flask')
      }
      
      // Express detection
      if (content.includes('express()') || content.includes('require("express")')) {
        frameworks.push('Express')
      }
      
      // FastAPI detection
      if (content.includes('from fastapi') || content.includes('FastAPI()')) {
        frameworks.push('FastAPI')
      }
    }
    
    this.context.framework = [...new Set(frameworks)]
    
    // Detect architecture patterns
    this.detectArchitecturePatterns(files)
  }

  private detectArchitecturePatterns(files: { file: string; content: string }[]) {
    const patterns: string[] = []
    
    // MVC pattern detection
    const hasModels = files.some(f => f.file.includes('model') || f.file.includes('Model'))
    const hasViews = files.some(f => f.file.includes('view') || f.file.includes('View'))
    const hasControllers = files.some(f => f.file.includes('controller') || f.file.includes('Controller'))
    
    if (hasModels && (hasViews || hasControllers)) {
      patterns.push('MVC')
    }
    
    // Repository pattern
    const hasRepositories = files.some(f => f.file.includes('repository') || f.file.includes('Repository'))
    if (hasRepositories) {
      patterns.push('Repository')
    }
    
    // Service layer pattern
    const hasServices = files.some(f => f.file.includes('service') || f.file.includes('Service'))
    if (hasServices) {
      patterns.push('Service Layer')
    }
    
    this.context.architecture.patterns = patterns
  }

  private printAnalysisSummary() {
    console.log(`
📊 Project Analysis Summary:
🔧 Frameworks: ${this.context.framework.join(', ') || 'None detected'}
🌐 Languages: ${this.context.languages.join(', ')}
📦 Dependencies: ${Object.values(this.context.dependencies).flat().length} total
🏗️ Architecture: ${this.context.architecture.patterns.join(', ') || 'No patterns detected'}
📝 Code Style: ${this.context.codeStyle.naming} naming
`)
  }

  getContext(): ProjectContext {
    return { ...this.context }
  }

  getFileContext(path: string): FileContext | undefined {
    return this.files.get(path)
  }

  getAllFiles(): FileContext[] {
    return Array.from(this.files.values())
  }

  generateContextPrompt(): string {
    const context = this.getContext()
    
    let prompt = `🧠 Project Context Analysis:\n\n`
    
    if (context.framework.length > 0) {
      prompt += `🔧 Frameworks: ${context.framework.join(', ')}\n`
    }
    
    if (context.languages.length > 0) {
      prompt += `🌐 Languages: ${context.languages.join(', ')}\n`
    }
    
    if (context.architecture.patterns.length > 0) {
      prompt += `🏗️ Architecture: ${context.architecture.patterns.join(', ')}\n`
    }
    
    prompt += `\n📝 Code Style:\n`
    prompt += `- Naming: ${context.codeStyle.naming}\n`
    prompt += `- Quotes: ${context.codeStyle.quotes}\n`
    prompt += `- Semicolons: ${context.codeStyle.semicolons ? 'Yes' : 'No'}\n`
    prompt += `- Indent: ${context.codeStyle.indent === 'spaces' ? `${context.codeStyle.indentSize} spaces` : 'tabs'}\n`
    
    if (Object.keys(context.dependencies).length > 0) {
      prompt += `\n📦 Dependencies:\n`
      for (const [lang, deps] of Object.entries(context.dependencies)) {
        prompt += `- ${lang}: ${deps.join(', ')}\n`
      }
    }
    
    prompt += `\n💡 I'll follow these patterns and conventions in my code generation.\n`
    
    return prompt
  }
}

// Singleton instance
export const codeContextService = new CodeContextService()

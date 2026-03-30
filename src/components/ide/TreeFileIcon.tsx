/** Minimal unicode icon mapping for file types - VS Code style */

export function TreeFileIcon({ fileName }: { fileName: string }) {
  const n = fileName.toLowerCase()
  const ext = n.includes('.') ? n.slice(n.lastIndexOf('.')) : ''

  const icon = getIconChar(n, ext)

  return (
    <span className="lex-treeFileIcon" title={getIconTitle(n, ext)}>
      {icon}
    </span>
  )
}

function getIconChar(fileName: string, ext: string): string {
  // Python
  if (ext === '.py' || ext === '.pyw' || ext === '.pyi') return '🐍'

  // TypeScript
  if (ext === '.ts') return 'T'

  // TSX
  if (ext === '.tsx') return '<'

  // JavaScript
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'J'

  // JSX
  if (ext === '.jsx') return '<'

  // JSON
  if (ext === '.json' || ext === '.jsonc') return '{}'

  // Markdown
  if (ext === '.md' || ext === '.mdx' || ext === '.markdown') return 'M'

  // HTML
  if (ext === '.html' || ext === '.htm') return '<'

  // CSS / SCSS / SASS / LESS
  if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less') return '≡'

  // Rust
  if (ext === '.rs') return 'R'

  // Go
  if (ext === '.go') return 'G'

  // Java
  if (ext === '.java') return 'J'

  // Kotlin
  if (ext === '.kt' || ext === '.kts') return 'K'

  // C / C++ / Header
  if (ext === '.cpp' || ext === '.cc' || ext === '.cxx' || ext === '.c' || ext === '.h' || ext === '.hpp') return 'C'

  // Shell
  if (ext === '.sh' || ext === '.bash' || ext === '.zsh') return '$'

  // PowerShell
  if (ext === '.ps1') return 'P'

  // YAML / TOML / INI / Config
  if (ext === '.yaml' || ext === '.yml' || ext === '.toml' || ext === '.ini' || ext === '.conf' || ext === '.config') return '⚙'

  // XML
  if (ext === '.xml') return 'X'

  // SVG
  if (ext === '.svg') return '◆'

  // Images
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.webp' || ext === '.ico' || ext === '.bmp') return '🖼'

  // Audio
  if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.flac' || ext === '.aac' || ext === '.m4a') return '♪'

  // Video
  if (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.mkv' || ext === '.avi' || ext === '.flv') return '▶'

  // Git files
  if (fileName === '.gitignore' || fileName === '.gitconfig' || fileName === '.gitattributes') return '⊙'

  // Package / Lock files
  if (fileName === 'package.json' || fileName === 'package-lock.json' || fileName === 'yarn.lock' || fileName === 'pnpm-lock.yaml') return '📦'

  // README
  if (fileName === 'readme.md' || fileName === 'readme.txt') return 'ℹ'

  // Directory
  if (fileName.endsWith('/')) return '📁'

  // Default file
  return '📄'
}

function getIconTitle(fileName: string, ext: string): string {
  if (ext === '.py') return 'Python'
  if (ext === '.ts') return 'TypeScript'
  if (ext === '.tsx') return 'TSX'
  if (ext === '.js') return 'JavaScript'
  if (ext === '.jsx') return 'JSX'
  if (ext === '.json') return 'JSON'
  if (ext === '.md') return 'Markdown'
  if (ext === '.html') return 'HTML'
  if (ext === '.css') return 'CSS'
  if (ext === '.rs') return 'Rust'
  if (ext === '.go') return 'Go'
  if (ext === '.java') return 'Java'
  if (ext === '.kt') return 'Kotlin'
  if (ext === '.cpp' || ext === '.c' || ext === '.h') return 'C/C++'
  if (ext === '.sh') return 'Shell'
  return 'File'
}

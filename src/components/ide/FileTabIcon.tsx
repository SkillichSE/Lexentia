import type { ReactNode } from 'react'

/** Small inline SVGs by extension (left of tab title). */

function IconWrap({ children, title }: { children: ReactNode; title: string }) {
  return (
    <span className="lex-fileTabIcon" title={title} aria-hidden>
      <svg className="lex-fileTabIconSvg" viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
        {children}
      </svg>
    </span>
  )
}

export function FileTabIcon({ fileName }: { fileName: string }) {
  const n = fileName.toLowerCase()
  const ext = n.includes('.') ? n.slice(n.lastIndexOf('.')) : ''

  if (ext === '.py' || ext === '.pyw' || ext === '.pyi') {
    return (
      <IconWrap title="Python">
        <path
          fill="#3776AB"
          d="M11.9 3.2c-2.4 0-4.4.5-4.4 1.4v2.2h4.5c.4 0 .7.3.7.7v2.4H6.8c-.9 0-1.6.7-1.6 1.6v3.4c0 2.3 2 3.4 4.4 3.4h2.2v-2.1c0-.8.7-1.5 1.5-1.5h4.5c.8 0 1.4-.7 1.4-1.5V7.6c0-2.3-2-3.4-4.4-3.4h-2.5zM9.3 4.8c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z"
        />
        <path
          fill="#FFD43B"
          d="M12.1 20.8c2.4 0 4.4-.5 4.4-1.4v-2.2h-4.5c-.4 0-.7-.3-.7-.7v-2.4h5.1c.9 0 1.6-.7 1.6-1.6v-3.4c0-2.3-2-3.4-4.4-3.4h-2.2v2.1c0 .8-.7 1.5-1.5 1.5H6.8c-.8 0-1.4.7-1.4 1.5v5.6c0 2.3 2 3.4 4.4 3.4h2.5zm2.6-1.6c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z"
        />
      </IconWrap>
    )
  }

  if (ext === '.ts' || ext === '.tsx') {
    return (
      <IconWrap title="TypeScript">
        <rect width="24" height="24" rx="3" fill="#3178C6" />
        <path
          fill="#fff"
          d="M14.5 12.7h3.2v1.1h-2.1v1.9h1.8v1.1h-1.8v2.4h-1.3v-6.5h-1.8v-1.1h1.8v-.8c0-1.1.9-2 2-2h1.1v1.1h-.8c-.3 0-.5.2-.5.5v.2zm-5.8-2.4c-1.5 0-2.7 1-2.7 2.4 0 1.1.7 1.8 1.9 2.2l.6.2c.7.2 1 .4 1 .8 0 .5-.4.8-1.1.8-.8 0-1.3-.4-1.5-1l-1.2.7c.4 1 1.4 1.6 2.7 1.6 1.6 0 2.7-1 2.7-2.3 0-1.2-.8-1.9-2-2.3l-.5-.2c-.6-.2-.9-.4-.9-.7 0-.4.4-.7 1-.7.6 0 1 .3 1.2.8l1.1-.8c-.4-.9-1.3-1.4-2.4-1.4z"
        />
      </IconWrap>
    )
  }

  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
    return (
      <IconWrap title="JavaScript">
        <rect width="24" height="24" rx="3" fill="#F7DF1E" />
        <path
          fill="#000"
          d="M15.7 18.3c.9 0 1.5-.5 1.5-1.4 0-.9-.5-1.4-1.6-1.9l-.3-.1c-.6-.3-.9-.5-.9-.9 0-.4.3-.6.8-.6.5 0 .8.2 1 .6l1.1-.7c-.5-.9-1.1-1.2-2.1-1.2-1.1 0-1.8.7-1.8 1.6 0 1 .6 1.5 1.5 1.9l.4.2c.6.3.8.5.8.9 0 .5-.4.8-1 .8-.7 0-1.2-.4-1.5-1.1l-1.2.7c.5 1.1 1.3 1.7 2.6 1.7zm-6.5 0c1.3 0 2.1-.8 2.1-2.2v-4.1h-1.4v4c0 .7-.4 1.1-1 1.1-.6 0-1-.4-1-1.1v-4H7.5v4.1c0 1.4.8 2.2 2.2 2.2z"
        />
      </IconWrap>
    )
  }

  if (ext === '.json') {
    return (
      <IconWrap title="JSON">
        <path fill="#cbcb41" d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z" />
      </IconWrap>
    )
  }

  if (ext === '.md' || ext === '.mdx') {
    return (
      <IconWrap title="Markdown">
        <path fill="#519aba" d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h2l1.5 2L13 8h2v8h-2v-5l-1.5 2-1.5-2v5H8V10z" />
      </IconWrap>
    )
  }

  if (ext === '.html' || ext === '.htm') {
    return (
      <IconWrap title="HTML">
        <path fill="#e37933" d="M4 4h16v16H4V4zm2 2v12h12V6H6zm1 2h10l-5 8-5-8z" />
      </IconWrap>
    )
  }

  if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less') {
    return (
      <IconWrap title="CSS">
        <path fill="#563d7c" d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 3h8v2H8v-2z" />
      </IconWrap>
    )
  }

  if (ext === '.rs') {
    return (
      <IconWrap title="Rust">
        <path fill="#dea584" d="M12 4l8 6-3 9H7L4 10l8-6z" />
      </IconWrap>
    )
  }

  if (ext === '.go') {
    return (
      <IconWrap title="Go">
        <path fill="#00ADD8" d="M4 12c2-4 6-6 8-6s6 2 8 6c-2 4-6 6-8 6s-6-2-8-6z" />
      </IconWrap>
    )
  }

  if (ext === '.java' || ext === '.kt' || ext === '.kts') {
    return (
      <IconWrap title={ext === '.java' ? 'Java' : 'Kotlin'}>
        <path fill="#f89820" d="M8 4h8v4H8V4zm0 6h8v10H8V10z" />
      </IconWrap>
    )
  }

  if (ext === '.cpp' || ext === '.cc' || ext === '.cxx' || ext === '.h' || ext === '.hpp') {
    return (
      <IconWrap title="C/C++">
        <path fill="#659ad2" d="M6 4h12v16H6V4zm3 3v10h6V7H9z" />
      </IconWrap>
    )
  }

  if (ext === '.sh' || ext === '.bash' || ext === '.zsh' || ext === '.ps1') {
    return (
      <IconWrap title="Shell">
        <path fill="#89e051" d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2h6v2H8v-2z" />
      </IconWrap>
    )
  }

  if (ext === '.yaml' || ext === '.yml') {
    return (
      <IconWrap title="YAML">
        <path fill="#cb171e" d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 3h5v2H8v-2z" />
      </IconWrap>
    )
  }

  if (ext === '.xml' || ext === '.svg') {
    return (
      <IconWrap title={ext === '.svg' ? 'SVG' : 'XML'}>
        <path fill="#cc6633" d="M6 4h12v16H6V4zm2 2v12h8V6H8zm2 2h4v8h-4V8z" />
      </IconWrap>
    )
  }

  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.webp' || ext === '.ico') {
    return (
      <IconWrap title="Image">
        <path fill="#a074c4" d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2h8l-2 3-2-2-2 2-2-3z" />
      </IconWrap>
    )
  }

  if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.flac') {
    return (
      <IconWrap title="Audio">
        <path fill="#f14c4c" d="M8 4h8v16H8V4zm2 2v12h4V6h-4z" />
      </IconWrap>
    )
  }

  if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
    return (
      <IconWrap title="Video">
        <path fill="#c586c0" d="M4 7h10v10H4V7zm12 2l4-2v12l-4-2V9z" />
      </IconWrap>
    )
  }

  return (
    <IconWrap title="File">
      <path fill="#a1a1aa" d="M6 3h7l5 5v13H6V3zm2 2v14h8V9h-4V5H8z" />
    </IconWrap>
  )
}

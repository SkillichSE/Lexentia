import React, { useMemo, useState } from 'react'

export type PendingFile = {
  id: string
  name: string
  size: number
  mime: string
  // For MVP we keep content transient; next to-do will send it to Python tools.
  file?: File
}

export function FilesPanel({ onChange }: { onChange: (files: PendingFile[]) => void }) {
  const [files, setFiles] = useState<PendingFile[]>([])

  const fileCountLabel = useMemo(() => `${files.length} file(s)`, [files.length])

  const onPickFiles = (picked: FileList | null) => {
    if (!picked) return
    const next = [...picked].map((f, idx) => ({
      id: `f-${Date.now()}-${idx}`,
      name: f.name,
      size: f.size,
      mime: f.type || 'unknown',
      file: f,
    }))
    setFiles(next)
    onChange(next)
  }

  return (
    <div className="lex-filesPanel">
      <div className="lex-subtle">{fileCountLabel}</div>
      <label className="lex-fileBtn">
        Upload
        <input
          type="file"
          multiple
          className="lex-fileInput"
          accept=".txt,.pdf,.docx,.zip"
          onChange={(e) => onPickFiles(e.target.files)}
        />
      </label>

      <div className="lex-filesList" aria-label="Files list">
        {files.length === 0 ? (
          <div className="lex-empty">Upload a file (.txt/.pdf/.docx/.zip)</div>
        ) : (
          files.map((f) => (
            <div className="lex-fileRow" key={f.id}>
              <div className="lex-fileName">{f.name}</div>
              <div className="lex-fileMeta">
                {(f.size / 1024).toFixed(1)} KB • {f.mime}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


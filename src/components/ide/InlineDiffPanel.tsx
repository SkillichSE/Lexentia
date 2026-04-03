// inline diff panel for chat integration per spec section 3.5
import React, { useState } from 'react'

export interface InlineDiffChange {
  id: string
  filePath: string
  oldContent?: string
  newContent: string
  type: 'create' | 'modify' | 'delete'
}

interface InlineDiffPanelProps {
  changes: InlineDiffChange[]
  onApply: (changeId: string) => void
  onCancel: (changeId: string) => void
  className?: string
}

function renderDiffLines(oldContent: string = '', newContent: string = ''): React.ReactElement[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLines = Math.max(oldLines.length, newLines.length)
  const lines: React.ReactElement[] = []

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    const isAdded = !oldLine && newLine
    const isRemoved = oldLine && !newLine
    const isChanged = oldLine && newLine && oldLine !== newLine

    lines.push(
      <div key={i} className="inline-diff-line">
        {isRemoved ? (
          <div className="inline-diff-removed">
            <span className="inline-diff-marker">-</span>
            <span className="inline-diff-content">{oldLine}</span>
          </div>
        ) : isAdded ? (
          <div className="inline-diff-added">
            <span className="inline-diff-marker">+</span>
            <span className="inline-diff-content">{newLine}</span>
          </div>
        ) : isChanged ? (
          <React.Fragment key={`${i}-changed`}>
            <div className="inline-diff-removed">
              <span className="inline-diff-marker">-</span>
              <span className="inline-diff-content">{oldLine}</span>
            </div>
            <div className="inline-diff-added">
              <span className="inline-diff-marker">+</span>
              <span className="inline-diff-content">{newLine}</span>
            </div>
          </React.Fragment>
        ) : (
          <div className="inline-diff-unchanged">
            <span className="inline-diff-marker"> </span>
            <span className="inline-diff-content">{newLine || oldLine}</span>
          </div>
        )}
      </div>
    )
  }

  return lines
}

export function InlineDiffPanel({ changes, onApply, onCancel, className = '' }: InlineDiffPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(changes.map(c => c.id)))

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (changes.length === 0) return null

  return (
    <div className={`inline-diff-panel ${className}`}>
      <div className="inline-diff-header">
        <span className="inline-diff-title">file changes ({changes.length})</span>
      </div>

      {changes.map(change => (
        <div key={change.id} className="inline-diff-file">
          <div
            className="inline-diff-file-header"
            onClick={() => toggleExpand(change.id)}
          >
            <span className="inline-diff-expand">
              {expanded.has(change.id) ? '▼' : '▶'}
            </span>
            <span className="inline-diff-filepath">{change.filePath}</span>
            <span className="inline-diff-type">
              {change.type === 'create' && 'new'}
              {change.type === 'modify' && 'modified'}
              {change.type === 'delete' && 'deleted'}
            </span>
          </div>

          {expanded.has(change.id) && (
            <div className="inline-diff-content">
              <pre className="inline-diff-code">
                {change.type === 'create' && (
                  <div className="inline-diff-added">
                    <span className="inline-diff-marker">+</span>
                    <span>{change.newContent}</span>
                  </div>
                )}
                {change.type === 'delete' && (
                  <div className="inline-diff-removed">
                    <span className="inline-diff-marker">-</span>
                    <span>{change.oldContent}</span>
                  </div>
                )}
                {change.type === 'modify' && renderDiffLines(change.oldContent, change.newContent)}
              </pre>

              <div className="inline-diff-actions">
                <button
                  type="button"
                  className="inline-diff-btn inline-diff-btn--apply"
                  onClick={() => onApply(change.id)}
                >
                  apply
                </button>
                <button
                  type="button"
                  className="inline-diff-btn inline-diff-btn--cancel"
                  onClick={() => onCancel(change.id)}
                >
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

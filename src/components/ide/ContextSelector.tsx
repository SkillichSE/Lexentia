// context selector ui per spec section 4.2
import React, { useState } from 'react'

export type ContextItem =
  | { type: 'file'; path: string }
  | { type: 'folder'; path: string }

interface ContextSelectorProps {
  items: ContextItem[]
  onAddFile: () => void
  onAddFolder: () => void
  onRemoveItem: (index: number) => void
  maxTokens?: number
  currentTokens?: number
  className?: string
}

export function ContextSelector({
  items,
  onAddFile,
  onAddFolder,
  onRemoveItem,
  maxTokens = 8192,
  currentTokens = 0,
  className = ''
}: ContextSelectorProps) {
  const percentage = Math.min((currentTokens / maxTokens) * 100, 100)
  const isOverLimit = currentTokens > maxTokens

  return (
    <div className={`context-selector ${className}`}>
      <div className="context-selector-header">
        <span className="context-selector-label">context:</span>
        <div className="context-selector-buttons">
          <button
            type="button"
            className="context-selector-btn"
            onClick={onAddFile}
          >
            add file
          </button>
          <button
            type="button"
            className="context-selector-btn"
            onClick={onAddFolder}
          >
            add folder
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="context-selector-items">
          {items.map((item, index) => (
            <div key={index} className={`context-item context-item--${item.type}`}>
              <span className="context-item-icon">
                {item.type === 'file' ? '📄' : '📁'}
              </span>
              <span className="context-item-path">{item.path}</span>
              <button
                type="button"
                className="context-item-remove"
                onClick={() => onRemoveItem(index)}
                aria-label="remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="context-token-bar">
        <div
          className={`context-token-fill ${isOverLimit ? 'over-limit' : ''}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="context-token-text">
          {currentTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </span>
      </div>
    </div>
  )
}

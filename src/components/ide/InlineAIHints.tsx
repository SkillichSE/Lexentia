// inline ai hints for editor per spec section 5
import React, { useState, useEffect, useRef } from 'react'

export interface InlineHint {
  id: string
  line: number
  message: string
  type: 'error' | 'warning' | 'suggestion'
}

interface InlineAIHintsProps {
  hints: InlineHint[]
  onFix: (hintId: string) => void
  onExplain: (hintId: string) => void
  onIgnore: (hintId: string) => void
  className?: string
}

export function InlineAIHints({
  hints,
  onFix,
  onExplain,
  onIgnore,
  className = ''
}: InlineAIHintsProps) {
  const [activeHint, setActiveHint] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // dismiss on click outside per spec section 5.4
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveHint(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // max 1 hint per viewport - show first only per spec section 5.4
  const visibleHint = hints[0]
  if (!visibleHint) return null

  const isActive = activeHint === visibleHint.id

  return (
    <div ref={containerRef} className={`inline-ai-hints ${className}`}>
      <div
        className={`inline-hint inline-hint--${visibleHint.type}`}
        onClick={() => setActiveHint(isActive ? null : visibleHint.id)}
      >
        <span className="inline-hint-text">{visibleHint.message}</span>
        <span className="inline-hint-chevron">{isActive ? '▲' : '▼'}</span>
      </div>

      {isActive && (
        <div className="inline-hint-popover">
          <div className="inline-hint-actions">
            <button
              type="button"
              className="inline-hint-btn inline-hint-btn--fix"
              onClick={(e) => {
                e.stopPropagation()
                onFix(visibleHint.id)
              }}
            >
              fix
            </button>
            <button
              type="button"
              className="inline-hint-btn inline-hint-btn--explain"
              onClick={(e) => {
                e.stopPropagation()
                onExplain(visibleHint.id)
              }}
            >
              explain
            </button>
            <button
              type="button"
              className="inline-hint-btn inline-hint-btn--ignore"
              onClick={(e) => {
                e.stopPropagation()
                onIgnore(visibleHint.id)
              }}
            >
              ignore
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// hook for managing inline hints
export function useInlineHints() {
  const [hints, setHints] = useState<InlineHint[]>([])

  const addHint = (hint: Omit<InlineHint, 'id'>) => {
    const id = `hint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setHints(prev => [...prev, { ...hint, id }])
    return id
  }

  const removeHint = (id: string) => {
    setHints(prev => prev.filter(h => h.id !== id))
  }

  const clearHints = () => {
    setHints([])
  }

  const updateHint = (id: string, updates: Partial<InlineHint>) => {
    setHints(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  return {
    hints,
    addHint,
    removeHint,
    clearHints,
    updateHint
  }
}

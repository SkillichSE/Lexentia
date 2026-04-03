// ai mode tabs component for switching between ask/edit/debug/agent modes
import React from 'react'

export type AIMode = 'ask' | 'edit' | 'debug' | 'agent'

interface AIModeTabsProps {
  activeMode: AIMode
  onModeChange: (mode: AIMode) => void
  className?: string
}

const modes: { id: AIMode; label: string }[] = [
  { id: 'ask', label: 'ask' },
  { id: 'edit', label: 'edit' },
  { id: 'debug', label: 'debug' },
  { id: 'agent', label: 'agent' },
]

export function AIModeTabs({ activeMode, onModeChange, className = '' }: AIModeTabsProps) {
  return (
    <div className={`ai-mode-tabs ${className}`}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`ai-mode-tab ${activeMode === mode.id ? 'ai-mode-tab--active' : ''}`}
          onClick={() => onModeChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

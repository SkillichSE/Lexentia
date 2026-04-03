// debug mode with terminal error parsing per spec section 6
import React, { useState, useEffect } from 'react'

export interface DebugInfo {
  file: string
  line: number
  message: string
  stack?: string
  type: 'error' | 'warning'
}

interface DebugModePanelProps {
  debugInfo: DebugInfo | null
  onFixAutomatically: () => void
  onExplainDeeper: () => void
  onDismiss: () => void
  className?: string
}

// parse terminal output for errors per spec section 6.2
export function parseDebugInfo(output: string): DebugInfo | null {
  // common error patterns
  const patterns = [
    // typescript/javascript stack traces
    /at\s+.+\s+\((.+):(\d+):(\d+)\)/,
    // python tracebacks
    /file\s+"(.+)",\s+line\s+(\d+)/i,
    // generic error: file:line
    /(\S+):(\d+):\s*(.+)/,
    // nodejs errors
    /(.+):(\d+)\n.+error:\s*(.+)/i,
  ]

  for (const pattern of patterns) {
    const match = output.match(pattern)
    if (match) {
      return {
        file: match[1] || 'unknown',
        line: parseInt(match[2], 10) || 0,
        message: match[3] || output.slice(0, 200),
        type: 'error',
        stack: output
      }
    }
  }

  // check for error keywords
  if (/error|exception|fail/i.test(output)) {
    return {
      file: 'unknown',
      line: 0,
      message: output.slice(0, 200),
      type: 'error',
      stack: output
    }
  }

  return null
}

export function DebugModePanel({
  debugInfo,
  onFixAutomatically,
  onExplainDeeper,
  onDismiss,
  className = ''
}: DebugModePanelProps) {
  if (!debugInfo) return null

  return (
    <div className={`debug-mode-panel ${className}`}>
      <div className="debug-header">
        <span className="debug-title">error detected</span>
        <button
          type="button"
          className="debug-dismiss"
          onClick={onDismiss}
          aria-label="dismiss"
        >
          ×
        </button>
      </div>

      <div className="debug-content">
        <div className="debug-location">
          file: {debugInfo.file}:{debugInfo.line}
        </div>
        <div className={`debug-message debug-message--${debugInfo.type}`}>
          {debugInfo.message}
        </div>
        {debugInfo.stack && (
          <pre className="debug-stack">
            {debugInfo.stack.slice(0, 500)}
            {debugInfo.stack.length > 500 ? '\n...' : ''}
          </pre>
        )}
      </div>

      <div className="debug-actions">
        <button
          type="button"
          className="debug-btn debug-btn--primary"
          onClick={onFixAutomatically}
        >
          fix automatically
        </button>
        <button
          type="button"
          className="debug-btn"
          onClick={onExplainDeeper}
        >
          explain deeper
        </button>
      </div>
    </div>
  )
}

// hook for debug mode
export function useDebugMode() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const analyzeOutput = (output: string) => {
    const info = parseDebugInfo(output)
    if (info) {
      setDebugInfo(info)
      return true
    }
    return false
  }

  const clearDebugInfo = () => {
    setDebugInfo(null)
  }

  const setManualDebugInfo = (info: DebugInfo) => {
    setDebugInfo(info)
  }

  return {
    debugInfo,
    analyzeOutput,
    clearDebugInfo,
    setManualDebugInfo
  }
}

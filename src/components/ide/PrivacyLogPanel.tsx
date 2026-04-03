// privacy log panel for transparency per spec section 9
import React, { useState } from 'react'

export interface PrivacyLogEntry {
  id: string
  timestamp: number
  type: 'request' | 'response' | 'error'
  payload: string
  truncated?: boolean
}

interface PrivacyLogPanelProps {
  entries: PrivacyLogEntry[]
  isLocalMode: boolean
  className?: string
}

export function PrivacyLogPanel({
  entries,
  isLocalMode,
  className = ''
}: PrivacyLogPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'request' | 'response' | 'error'>('all')

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

  const filteredEntries = entries.filter(e => filter === 'all' || e.type === filter)

  return (
    <div className={`privacy-log-panel ${className}`}>
      <div className="privacy-log-header">
        <span className="privacy-log-status">
          {isLocalMode ? 'local mode' : 'remote mode'}
        </span>
        <div className="privacy-log-filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="privacy-log-filter"
          >
            <option value="all">all</option>
            <option value="request">requests</option>
            <option value="response">responses</option>
            <option value="error">errors</option>
          </select>
        </div>
      </div>

      <div className="privacy-log-entries">
        {filteredEntries.length === 0 ? (
          <div className="privacy-log-empty">no logged requests</div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`privacy-log-entry privacy-log-entry--${entry.type}`}
            >
              <div
                className="privacy-log-entry-header"
                onClick={() => toggleExpand(entry.id)}
              >
                <span className="privacy-log-entry-type">{entry.type}</span>
                <span className="privacy-log-entry-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                {entry.truncated && (
                  <span className="privacy-log-entry-truncated">truncated</span>
                )}
                <span className="privacy-log-entry-toggle">
                  {expanded.has(entry.id) ? '▼' : '▶'}
                </span>
              </div>

              {expanded.has(entry.id) && (
                <pre className="privacy-log-entry-payload">
                  {entry.payload}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// hook for privacy logging
export function usePrivacyLog() {
  const [entries, setEntries] = useState<PrivacyLogEntry[]>([])

  const logRequest = (payload: string) => {
    const entry: PrivacyLogEntry = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'request',
      payload,
      truncated: payload.length > 1000
    }
    setEntries(prev => [...prev, entry])
  }

  const logResponse = (payload: string) => {
    const entry: PrivacyLogEntry = {
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'response',
      payload,
      truncated: payload.length > 1000
    }
    setEntries(prev => [...prev, entry])
  }

  const logError = (payload: string) => {
    const entry: PrivacyLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'error',
      payload
    }
    setEntries(prev => [...prev, entry])
  }

  const clearLog = () => {
    setEntries([])
  }

  return {
    entries,
    logRequest,
    logResponse,
    logError,
    clearLog
  }
}

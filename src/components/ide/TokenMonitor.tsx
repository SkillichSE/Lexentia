import React, { useState, useEffect } from 'react'

export interface TokenMetrics {
  tokensPerSecond: number
  totalTokens: number
  contextWindowUsed: number
  contextWindowTotal: number
  estimatedTimeRemaining: number // seconds
  memoryUsage: {
    used: number // MB
    total: number // MB
  }
}

export interface StreamMetrics {
  chunksReceived: number
  totalChunks: number
  bytesReceived: number
  startTime: number
  estimatedCompletionTime: number
}

interface TokenMonitorProps {
  isActive: boolean
  className?: string
}

export function TokenMonitor({ isActive, className = '' }: TokenMonitorProps) {
  const [metrics, setMetrics] = useState<TokenMetrics>({
    tokensPerSecond: 0,
    totalTokens: 0,
    contextWindowUsed: 0,
    contextWindowTotal: 4096, // Default for many models
    estimatedTimeRemaining: 0,
    memoryUsage: { used: 0, total: 0 }
  })

  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics>({
    chunksReceived: 0,
    totalChunks: 0,
    bytesReceived: 0,
    startTime: 0,
    estimatedCompletionTime: 0
  })

  // Simulate real-time metrics (in real implementation, connect to actual streaming data)
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setMetrics(prev => {
        const newTokens = prev.totalTokens + Math.floor(Math.random() * 50) + 10
        const elapsed = (Date.now() - streamMetrics.startTime) / 1000
        const tps = elapsed > 0 ? newTokens / elapsed : 0
        
        return {
          ...prev,
          tokensPerSecond: tps,
          totalTokens: newTokens,
          contextWindowUsed: Math.min(newTokens, prev.contextWindowTotal),
          estimatedTimeRemaining: tps > 0 ? (prev.contextWindowTotal - newTokens) / tps : 0,
          memoryUsage: {
            used: Math.floor(Math.random() * 2000) + 1000,
            total: 8192
          }
        }
      })

      setStreamMetrics(prev => ({
        ...prev,
        chunksReceived: prev.chunksReceived + 1,
        bytesReceived: prev.bytesReceived + Math.floor(Math.random() * 1000) + 100
      }))
    }, 100)

    return () => clearInterval(interval)
  }, [isActive, streamMetrics.startTime])

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const getContextPercentage = (): number => {
    return (metrics.contextWindowUsed / metrics.contextWindowTotal) * 100
  }

  const getMemoryPercentage = (): number => {
    return (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100
  }

  const getSpeedColor = (): string => {
    if (metrics.tokensPerSecond > 50) return '#28a745' // Green
    if (metrics.tokensPerSecond > 20) return '#ffc107' // Yellow
    return '#dc3545' // Red
  }

  const getContextColor = (): string => {
    const percentage = getContextPercentage()
    if (percentage > 90) return '#dc3545' // Red
    if (percentage > 75) return '#ffc107' // Yellow
    return '#28a745' // Green
  }

  return (
    <div className={`token-monitor ${className}`}>
      {/* Header */}
      <div className="token-monitor-header">
        <span className="token-monitor-title">Performance Monitor</span>
        <div className={`token-monitor-status ${isActive ? 'active' : 'idle'}`}>
          {isActive ? '[active]' : '[idle]'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="token-metrics-grid">
        {/* Tokens Per Second */}
        <div className="metric-card">
          <div className="metric-label">Tokens/Second</div>
          <div className="metric-value" style={{ color: getSpeedColor() }}>
            {metrics.tokensPerSecond.toFixed(1)}
          </div>
        </div>

        {/* Total Tokens */}
        <div className="metric-card">
          <div className="metric-label">Total Tokens</div>
          <div className="metric-value">
            {metrics.totalTokens.toLocaleString()}
          </div>
        </div>

        {/* Context Window */}
        <div className="metric-card">
          <div className="metric-label">Context Window</div>
          <div className="metric-value" style={{ color: getContextColor() }}>
            {metrics.contextWindowUsed.toLocaleString()} / {metrics.contextWindowTotal.toLocaleString()}
          </div>
          <div className="metric-bar">
            <div 
              className="metric-bar-fill" 
              style={{ 
                width: `${getContextPercentage()}%`,
                backgroundColor: getContextColor()
              }}
            />
          </div>
        </div>

        {/* Estimated Time */}
        <div className="metric-card">
          <div className="metric-label">Est. Time Remaining</div>
          <div className="metric-value">
            {metrics.estimatedTimeRemaining > 0 ? formatTime(metrics.estimatedTimeRemaining) : '∞'}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="metric-card">
          <div className="metric-label">Memory Usage</div>
          <div className="metric-value">
            {formatBytes(metrics.memoryUsage.used * 1024 * 1024)} / {formatBytes(metrics.memoryUsage.total * 1024 * 1024)}
          </div>
          <div className="metric-bar">
            <div 
              className="metric-bar-fill" 
              style={{ 
                width: `${getMemoryPercentage()}%`,
                backgroundColor: getMemoryPercentage() > 90 ? '#dc3545' : '#28a745'
              }}
            />
          </div>
        </div>

        {/* Streaming Stats */}
        {isActive && (
          <div className="metric-card">
            <div className="metric-label">Streaming</div>
            <div className="metric-value">
              {formatBytes(streamMetrics.bytesReceived)}
            </div>
            <div className="metric-subtitle">
              {streamMetrics.chunksReceived} chunks
            </div>
          </div>
        )}
      </div>

      {/* Performance Indicators */}
      <div className="performance-indicators">
        <div className="indicator">
          <span className="indicator-label">Speed:</span>
          <span className="indicator-value" style={{ color: getSpeedColor() }}>
            {metrics.tokensPerSecond > 50 ? 'Fast' : metrics.tokensPerSecond > 20 ? 'Medium' : 'Slow'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Context:</span>
          <span className="indicator-value" style={{ color: getContextColor() }}>
            {getContextPercentage() > 90 ? 'Critical' : getContextPercentage() > 75 ? 'Warning' : 'Good'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Memory:</span>
          <span className="indicator-value" style={{ color: getMemoryPercentage() > 90 ? '#dc3545' : '#28a745' }}>
            {getMemoryPercentage() > 90 ? 'High' : 'Normal'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Hook for tracking token usage
export function useTokenMetrics() {
  const [metrics, setMetrics] = useState<TokenMetrics>({
    tokensPerSecond: 0,
    totalTokens: 0,
    contextWindowUsed: 0,
    contextWindowTotal: 4096,
    estimatedTimeRemaining: 0,
    memoryUsage: { used: 0, total: 8192 }
  })

  const [isStreaming, setIsStreaming] = useState(false)
  const [startTime, setStartTime] = useState(0)

  const startStreaming = React.useCallback(() => {
    setIsStreaming(true)
    setStartTime(Date.now())
    setMetrics(prev => ({
      ...prev,
      totalTokens: 0,
      tokensPerSecond: 0
    }))
  }, [])

  const updateTokens = React.useCallback((tokenCount: number) => {
    if (!isStreaming) return

    setMetrics(prev => {
      const elapsed = (Date.now() - startTime) / 1000
      const tps = elapsed > 0 ? tokenCount / elapsed : 0
      
      return {
        ...prev,
        totalTokens: tokenCount,
        tokensPerSecond: tps,
        contextWindowUsed: Math.min(tokenCount, prev.contextWindowTotal),
        estimatedTimeRemaining: tps > 0 ? (prev.contextWindowTotal - tokenCount) / tps : 0
      }
    })
  }, [isStreaming, startTime])

  const stopStreaming = React.useCallback(() => {
    setIsStreaming(false)
  }, [])

  const setContextWindow = React.useCallback((total: number) => {
    setMetrics(prev => ({ ...prev, contextWindowTotal: total }))
  }, [])

  return {
    metrics,
    isStreaming,
    startStreaming,
    stopStreaming,
    updateTokens,
    setContextWindow
  }
}

import { useEffect, useState } from 'react'
import { codeAnimationService, type ProjectAnimationState, type FileAnimationState } from '../../services/codeAnimationService'

export function CodeAnimationPanel() {
  const [animationState, setAnimationState] = useState<ProjectAnimationState>(codeAnimationService.getState())

  useEffect(() => {
    const unsubscribe = codeAnimationService.subscribe(setAnimationState)
    return unsubscribe
  }, [])

  if (animationState.status === 'idle') {
    return null
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const formatLines = (lines: number) => {
    if (lines >= 1000) return `${(lines / 1000).toFixed(1)}k`
    return lines.toString()
  }

  const getProgressBar = (progress: number) => {
    const filled = Math.floor(progress / 10)
    return '█'.repeat(filled) + '░'.repeat(10 - filled)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'starting': return '🔄'
      case 'writing': return '✍️'
      case 'completed': return '✅'
      case 'error': return '❌'
      default: return '⏸️'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starting': return '#ffa500'
      case 'writing': return '#00bfff'
      case 'completed': return '#00ff00'
      case 'error': return '#ff4444'
      default: return '#888888'
    }
  }

  return (
    <div className="lex-animationPanel">
      <div className="lex-animationHeader">
        <div className="lex-animationTitle">
          {getStatusIcon(animationState.status)} Living Codebase
        </div>
        <div className="lex-animationStats">
          <span className="lex-stat">
            📁 {animationState.completedFiles}/{animationState.totalFiles}
          </span>
          <span className={`lex-stat ${animationState.totalLinesAdded >= 0 ? 'positive' : 'negative'}`}>
            {animationState.totalLinesAdded >= 0 ? '+' : ''}{formatLines(animationState.totalLinesAdded)} lines
          </span>
          {animationState.totalLinesRemoved > 0 && (
            <span className="lex-stat negative">
              -{formatLines(animationState.totalLinesRemoved)} lines
            </span>
          )}
          {animationState.status === 'active' && (
            <span className="lex-stat">
              ⏱️ {formatTime(Date.now() - animationState.startTime)}
            </span>
          )}
        </div>
      </div>

      <div className="lex-animationFiles">
        {Object.entries(animationState.activeFiles).map(([fileId, fileState]) => (
          <div key={fileId} className="lex-animationFile">
            <div className="lex-fileHeader">
              <div className="lex-fileInfo">
                <span className="lex-fileStatus" style={{ color: getStatusColor(fileState.status) }}>
                  {getStatusIcon(fileState.status)}
                </span>
                <span className="lex-fileName">{fileState.fileName}</span>
                <span className="lex-fileProgress">
                  {fileState.currentLines}/{fileState.totalLines} lines
                </span>
              </div>
              <div className="lex-fileMetrics">
                <span className={`lex-lineCount ${fileState.linesAdded >= 0 ? 'positive' : 'negative'}`}>
                  {fileState.linesAdded >= 0 ? '+' : ''}{fileState.linesAdded}
                </span>
                {fileState.linesRemoved > 0 && (
                  <span className="lex-lineCount negative">-{fileState.linesRemoved}</span>
                )}
                {fileState.estimatedCompletion && fileState.status === 'writing' && (
                  <span className="lex-timeEstimate">
                    ⏱️ {formatTime(fileState.estimatedCompletion - Date.now())}
                  </span>
                )}
              </div>
            </div>
            
            {fileState.status !== 'starting' && (
              <div className="lex-progressBar">
                <div className="lex-progressFill" style={{ width: `${fileState.progress}%` }} />
                <div className="lex-progressText">
                  {getProgressBar(fileState.progress)} {Math.round(fileState.progress)}%
                </div>
              </div>
            )}

            {fileState.status === 'completed' && (
              <div className="lex-fileCompleted">
                ✅ Completed in {formatTime(Date.now() - fileState.startTime)}
              </div>
            )}

            {fileState.status === 'error' && (
              <div className="lex-fileError">
                ❌ Failed to write file
              </div>
            )}
          </div>
        ))}
      </div>

      {animationState.status === 'completed' && (
        <div className="lex-animationSummary">
          <div className="lex-summaryTitle">
            🎉 All files completed successfully!
          </div>
          <div className="lex-summaryStats">
            <span>📁 {animationState.totalFiles} files</span>
            <span className="positive">+{formatLines(animationState.totalLinesAdded)} lines added</span>
            {animationState.totalLinesRemoved > 0 && (
              <span className="negative">-{formatLines(animationState.totalLinesRemoved)} lines removed</span>
            )}
            <span>⏱️ Total time: {formatTime(Date.now() - animationState.startTime)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'

// Simple diff implementation (replace with react-diff-view when installed)
interface DiffProps {
  viewType: 'split' | 'unified'
  diffType: 'create' | 'modify' | 'delete'
  oldText: string
  newText: string
  children: (hunks: DiffHunk[]) => React.ReactNode
}

interface DiffHunk {
  content: string
  oldStart: number
  newStart: number
  changes: Array<{
    type: 'insert' | 'delete' | 'equal'
    content: string
  }>
}

function Diff({ children, oldText, newText }: DiffProps) {
  // Simple placeholder diff implementation
  const hunks: DiffHunk[] = [{
    content: 'Changes',
    oldStart: 1,
    newStart: 1,
    changes: [
      { type: 'equal', content: oldText },
      { type: 'insert', content: newText }
    ]
  }]
  
  return <>{children(hunks)}</>
}

function Hunk({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="diff-hunk">
      <div className="diff-hunk-content">{hunk.content}</div>
    </div>
  )
}

export interface FileChange {
  filePath: string
  oldContent?: string
  newContent: string
  type: 'create' | 'modify' | 'delete'
}

export interface DiffSection {
  id: string
  filePath: string
  changes: FileChange
  hunks: Array<{
    oldStart: number
    oldLines: string[]
    newStart: number
    newLines: string[]
    changes: Array<{
      type: 'insert' | 'delete' | 'equal'
      content: string
    }>
  }>
}

interface DiffViewerProps {
  sections: DiffSection[]
  onAcceptSection: (sectionId: string) => void
  onRejectSection: (sectionId: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
  className?: string
}

export function DiffViewer({
  sections,
  onAcceptSection,
  onRejectSection,
  onAcceptAll,
  onRejectAll,
  className = ''
}: DiffViewerProps) {
  const [acceptedSections, setAcceptedSections] = useState<Set<string>>(new Set())
  const [rejectedSections, setRejectedSections] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const handleAcceptSection = (sectionId: string) => {
    setAcceptedSections(prev => new Set([...prev, sectionId]))
    setRejectedSections(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
    onAcceptSection(sectionId)
  }

  const handleRejectSection = (sectionId: string) => {
    setRejectedSections(prev => new Set([...prev, sectionId]))
    setAcceptedSections(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
    onRejectSection(sectionId)
  }

  const handleAcceptAll = () => {
    const allSectionIds = sections.map(s => s.id)
    setAcceptedSections(new Set(allSectionIds))
    setRejectedSections(new Set())
    onAcceptAll()
  }

  const handleRejectAll = () => {
    const allSectionIds = sections.map(s => s.id)
    setRejectedSections(new Set(allSectionIds))
    setAcceptedSections(new Set())
    onRejectAll()
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const getSectionStatus = (sectionId: string) => {
    if (acceptedSections.has(sectionId)) return 'accepted'
    if (rejectedSections.has(sectionId)) return 'rejected'
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#28a745'
      case 'rejected': return '#dc3545'
      default: return '#ffc107'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return '✓'
      case 'rejected': return '✗'
      default: return '○'
    }
  }

  return (
    <div className={`diff-viewer ${className}`}>
      {/* Header with actions */}
      <div className="diff-header">
        <div className="diff-title">
          <h3>Code Changes Preview</h3>
          <span className="diff-count">
            {sections.length} file{sections.length !== 1 ? 's' : ''} changed
          </span>
        </div>
        <div className="diff-actions">
          <button 
            className="diff-btn diff-btn-accept" 
            onClick={handleAcceptAll}
            disabled={acceptedSections.size === sections.length}
          >
            Accept All ({sections.length - acceptedSections.size})
          </button>
          <button 
            className="diff-btn diff-btn-reject" 
            onClick={handleRejectAll}
            disabled={rejectedSections.size === sections.length}
          >
            Reject All ({sections.length - rejectedSections.size})
          </button>
        </div>
      </div>

      {/* Diff sections */}
      <div className="diff-sections">
        {sections.map(section => {
          const status = getSectionStatus(section.id)
          const isExpanded = expandedSections.has(section.id)
          
          return (
            <div 
              key={section.id} 
              className={`diff-section diff-section-${status}`}
            >
              {/* Section header */}
              <div 
                className="diff-section-header"
                onClick={() => toggleSection(section.id)}
              >
                <div className="diff-section-info">
                  <span className="diff-section-status" style={{ color: getStatusColor(status) }}>
                    {getStatusIcon(status)}
                  </span>
                  <span className="diff-section-file">{section.filePath}</span>
                  <span className="diff-section-type">
                    {section.changes.type === 'create' && 'Created'}
                    {section.changes.type === 'modify' && 'Modified'}
                    {section.changes.type === 'delete' && 'Deleted'}
                  </span>
                </div>
                <div className="diff-section-actions">
                  <button
                    className={`diff-btn-small ${status === 'accepted' ? 'diff-btn-accepted' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAcceptSection(section.id)
                    }}
                    disabled={status === 'accepted'}
                  >
                    Accept
                  </button>
                  <button
                    className={`diff-btn-small ${status === 'rejected' ? 'diff-btn-rejected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRejectSection(section.id)
                    }}
                    disabled={status === 'rejected'}
                  >
                    Reject
                  </button>
                  <span className="diff-expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* Diff content */}
              {isExpanded && (
                <div className="diff-content">
                  {section.changes.type === 'create' && (
                    <div className="diff-create">
                      <div className="diff-file-header">New file: {section.filePath}</div>
                      <pre className="diff-code">
                        <code>{section.changes.newContent}</code>
                      </pre>
                    </div>
                  )}
                  
                  {section.changes.type === 'delete' && (
                    <div className="diff-delete">
                      <div className="diff-file-header">Deleted file: {section.filePath}</div>
                      <pre className="diff-code">
                        <code>{section.changes.oldContent}</code>
                      </pre>
                    </div>
                  )}
                  
                  {section.changes.type === 'modify' && section.changes.oldContent && (
                    <Diff
                      viewType="split"
                      diffType="modify"
                      oldText={section.changes.oldContent}
                      newText={section.changes.newContent}
                    >
                      {(hunks: DiffHunk[]) =>
                        hunks.map((hunk: DiffHunk) => (
                          <Hunk key={hunk.content} hunk={hunk} />
                        ))
                      }
                    </Diff>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer summary */}
      <div className="diff-footer">
        <div className="diff-summary">
          <span className="diff-summary-item accepted">
            ✓ Accepted: {acceptedSections.size}
          </span>
          <span className="diff-summary-item rejected">
            ✗ Rejected: {rejectedSections.size}
          </span>
          <span className="diff-summary-item pending">
            ○ Pending: {sections.length - acceptedSections.size - rejectedSections.size}
          </span>
        </div>
      </div>
    </div>
  )
}

// Hook for managing diff state
export function useDiffViewer() {
  const [sections, setSections] = useState<DiffSection[]>([])
  const [acceptedSectionIds, setAcceptedSectionIds] = useState<Set<string>>(new Set())
  const [rejectedSectionIds, setRejectedSectionIds] = useState<Set<string>>(new Set())

  const addSection = (section: DiffSection) => {
    setSections(prev => [...prev, section])
  }

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId))
    setAcceptedSectionIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
    setRejectedSectionIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
  }

  const acceptSection = (sectionId: string) => {
    setAcceptedSectionIds(prev => new Set([...prev, sectionId]))
    setRejectedSectionIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
  }

  const rejectSection = (sectionId: string) => {
    setRejectedSectionIds(prev => new Set([...prev, sectionId]))
    setAcceptedSectionIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
  }

  const acceptAll = () => {
    const allIds = sections.map(s => s.id)
    setAcceptedSectionIds(new Set(allIds))
    setRejectedSectionIds(new Set())
  }

  const rejectAll = () => {
    const allIds = sections.map(s => s.id)
    setRejectedSectionIds(new Set(allIds))
    setAcceptedSectionIds(new Set())
  }

  const clear = () => {
    setSections([])
    setAcceptedSectionIds(new Set())
    setRejectedSectionIds(new Set())
  }

  const getAcceptedChanges = (): DiffSection[] => {
    return sections.filter(s => acceptedSectionIds.has(s.id))
  }

  const getRejectedChanges = (): DiffSection[] => {
    return sections.filter(s => rejectedSectionIds.has(s.id))
  }

  const getPendingChanges = (): DiffSection[] => {
    return sections.filter(s => !acceptedSectionIds.has(s.id) && !rejectedSectionIds.has(s.id))
  }

  return {
    sections,
    acceptedSectionIds,
    rejectedSectionIds,
    addSection,
    removeSection,
    acceptSection,
    rejectSection,
    acceptAll,
    rejectAll,
    clear,
    getAcceptedChanges,
    getRejectedChanges,
    getPendingChanges
  }
}

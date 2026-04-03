// Undo History System for Agent Changes
import React from 'react'
import { type FileChange } from '../components/ide/DiffViewer'

export interface ChangeRecord {
  id: string
  timestamp: number
  description: string
  changes: FileChange[]
  metadata: {
    agentName?: string
    sessionId?: string
    prompt?: string
    model?: string
    temperature?: number
  }
}

export interface UndoState {
  canUndo: boolean
  canRedo: boolean
  historySize: number
  currentIndex: number
}

export class UndoHistory {
  private history: ChangeRecord[] = []
  private currentIndex: number = -1
  private maxHistorySize: number = 50
  private listeners: Set<(state: UndoState) => void> = new Set()

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize
  }

  // Add a new change record
  addRecord(record: Omit<ChangeRecord, 'id' | 'timestamp'>): string {
    const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullRecord: ChangeRecord = {
      ...record,
      id,
      timestamp: Date.now()
    }

    // Remove any records after current position (redo stack)
    this.history = this.history.slice(0, this.currentIndex + 1)
    
    // Add new record
    this.history.push(fullRecord)
    this.currentIndex = this.history.length - 1

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
      this.currentIndex = this.history.length - 1
    }

    this.notifyListeners()
    return id
  }

  // Undo to previous state
  undo(): ChangeRecord | null {
    if (this.currentIndex <= 0) return null
    
    this.currentIndex--
    this.notifyListeners()
    return this.history[this.currentIndex]
  }

  // Redo to next state
  redo(): ChangeRecord | null {
    if (this.currentIndex >= this.history.length - 1) return null
    
    this.currentIndex++
    this.notifyListeners()
    return this.history[this.currentIndex]
  }

  // Get current record
  getCurrentRecord(): ChangeRecord | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex]
    }
    return null
  }

  // Get all records up to current position
  getAppliedRecords(): ChangeRecord[] {
    return this.history.slice(0, this.currentIndex + 1)
  }

  // Get specific record by ID
  getRecord(id: string): ChangeRecord | null {
    return this.history.find(record => record.id === id) || null
  }

  // Get state for UI
  getState(): UndoState {
    return {
      canUndo: this.currentIndex > 0,
      canRedo: this.currentIndex < this.history.length - 1,
      historySize: this.history.length,
      currentIndex: this.currentIndex
    }
  }

  // Clear all history
  clear(): void {
    this.history = []
    this.currentIndex = -1
    this.notifyListeners()
  }

  // Jump to specific record
  jumpToRecord(recordId: string): boolean {
    const index = this.history.findIndex(record => record.id === recordId)
    if (index !== -1) {
      this.currentIndex = index
      this.notifyListeners()
      return true
    }
    return false
  }

  // Subscribe to state changes
  subscribe(listener: (state: UndoState) => void): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  // Get history summary for display
  getHistorySummary(): Array<{
    id: string
    description: string
    timestamp: number
    isCurrent: boolean
    changeCount: number
  }> {
    return this.history.map((record, index) => ({
      id: record.id,
      description: record.description,
      timestamp: record.timestamp,
      isCurrent: index === this.currentIndex,
      changeCount: record.changes.length
    }))
  }

  // Export history for persistence
  export(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
      exportedAt: Date.now()
    }, null, 2)
  }

  // Import history from persistence
  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed.history) && typeof parsed.currentIndex === 'number') {
        this.history = parsed.history
        this.currentIndex = parsed.currentIndex
        this.notifyListeners()
        return true
      }
    } catch (error) {
      console.error('Failed to import undo history:', error)
    }
    return false
  }
}

// File system operations for undo/redo
export class FileOperationManager {
  private undoHistory: UndoHistory
  private originalFiles: Map<string, string> = new Map()

  constructor(undoHistory: UndoHistory) {
    this.undoHistory = undoHistory
  }

  // Backup original file content before changes
  async backupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        const result = await window.lexentia.fs.readFile(filePath)
        if (result.ok && result.content !== undefined) {
          this.originalFiles.set(filePath, result.content)
        }
      } catch (error) {
        console.warn(`Failed to backup file ${filePath}:`, error)
      }
    }
  }

  // Apply changes and create undo record
  async applyChanges(
    changes: FileChange[],
    metadata: ChangeRecord['metadata']
  ): Promise<string> {
    // Backup files that will be modified
    const filePaths = changes
      .filter(change => change.type === 'modify' || change.type === 'delete')
      .map(change => change.filePath)
    
    await this.backupFiles(filePaths)

    // Apply changes
    for (const change of changes) {
      try {
        switch (change.type) {
          case 'create':
            await window.lexentia.fs.writeFile(change.filePath, change.newContent)
            break
          case 'modify':
            await window.lexentia.fs.writeFile(change.filePath, change.newContent)
            break
          case 'delete':
            // In a real implementation, you might want to move to trash instead
            await window.lexentia.fs.writeFile(change.filePath, '')
            break
        }
      } catch (error) {
        console.error(`Failed to apply change to ${change.filePath}:`, error)
        throw error
      }
    }

    // Create undo record
    const undoChanges: FileChange[] = changes.map(change => {
      if (change.type === 'modify' || change.type === 'delete') {
        const originalContent = this.originalFiles.get(change.filePath) || ''
        return {
          ...change,
          type: change.type === 'modify' ? 'modify' : 'create' as const,
          oldContent: change.newContent,
          newContent: originalContent
        }
      }
      return {
        ...change,
        type: change.type === 'create' ? 'delete' : 'create' as const,
        oldContent: change.newContent,
        newContent: ''
      }
    })

    return this.undoHistory.addRecord({
      description: this.generateDescription(changes),
      changes: undoChanges,
      metadata
    })
  }

  // Revert changes from undo record
  async revertChanges(record: ChangeRecord): Promise<void> {
    for (const change of record.changes) {
      try {
        switch (change.type) {
          case 'create':
            await window.lexentia.fs.writeFile(change.filePath, change.newContent)
            break
          case 'modify':
            await window.lexentia.fs.writeFile(change.filePath, change.newContent)
            break
          case 'delete':
            await window.lexentia.fs.writeFile(change.filePath, '')
            break
        }
      } catch (error) {
        console.error(`Failed to revert change to ${change.filePath}:`, error)
        throw error
      }
    }
  }

  private generateDescription(changes: FileChange[]): string {
    const fileCount = changes.length
    const creates = changes.filter(c => c.type === 'create').length
    const modifies = changes.filter(c => c.type === 'modify').length
    const deletes = changes.filter(c => c.type === 'delete').length

    const parts: string[] = []
    if (creates > 0) parts.push(`${creates} created`)
    if (modifies > 0) parts.push(`${modifies} modified`)
    if (deletes > 0) parts.push(`${deletes} deleted`)

    return `Changed ${fileCount} file${fileCount !== 1 ? 's' : ''} (${parts.join(', ')})`
  }
}

// Hook for React components
export function useUndoHistory(undoHistory: UndoHistory) {
  const [state, setState] = React.useState<UndoState>(undoHistory.getState())

  React.useEffect(() => {
    return undoHistory.subscribe(setState)
  }, [undoHistory])

  const undo = React.useCallback(() => {
    return undoHistory.undo()
  }, [undoHistory])

  const redo = React.useCallback(() => {
    return undoHistory.redo()
  }, [undoHistory])

  const getCurrentRecord = React.useCallback(() => {
    return undoHistory.getCurrentRecord()
  }, [undoHistory])

  const getHistorySummary = React.useCallback(() => {
    return undoHistory.getHistorySummary()
  }, [undoHistory])

  const jumpToRecord = React.useCallback((recordId: string) => {
    return undoHistory.jumpToRecord(recordId)
  }, [undoHistory])

  const clear = React.useCallback(() => {
    undoHistory.clear()
  }, [undoHistory])

  return {
    state,
    undo,
    redo,
    getCurrentRecord,
    getHistorySummary,
    jumpToRecord,
    clear
  }
}

// Global instances
export const globalUndoHistory = new UndoHistory()
export const fileOperationManager = new FileOperationManager(globalUndoHistory)

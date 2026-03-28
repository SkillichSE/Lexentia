export type FileAnimationState = {
  fileName: string
  status: 'starting' | 'writing' | 'completed' | 'error'
  currentLines: number
  totalLines: number
  progress: number
  linesAdded: number
  linesRemoved: number
  startTime: number
  estimatedCompletion?: number
}

export type ProjectAnimationState = {
  activeFiles: Record<string, FileAnimationState>
  totalFiles: number
  completedFiles: number
  totalLinesAdded: number
  totalLinesRemoved: number
  startTime: number
  status: 'idle' | 'active' | 'completed' | 'error'
}

export class CodeAnimationService {
  private state: ProjectAnimationState = {
    activeFiles: {},
    totalFiles: 0,
    completedFiles: 0,
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    startTime: 0,
    status: 'idle'
  }

  private listeners: ((state: ProjectAnimationState) => void)[] = []
  private animationIntervals: Record<string, NodeJS.Timeout> = {}

  subscribe(listener: (state: ProjectAnimationState) => void) {
    this.listeners.push(listener)
    listener(this.state)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }))
  }

  startFileAnimation(fileName: string, estimatedLines: number) {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fileState: FileAnimationState = {
      fileName,
      status: 'starting',
      currentLines: 0,
      totalLines: estimatedLines,
      progress: 0,
      linesAdded: 0,
      linesRemoved: 0,
      startTime: Date.now(),
      estimatedCompletion: Date.now() + (estimatedLines * 100) // 100ms per line
    }

    this.state.activeFiles[fileId] = fileState
    this.state.totalFiles++
    this.state.status = 'active'
    this.notifyListeners()

    // Start animation after a short delay
    setTimeout(() => this.animateFile(fileId), 500)
    
    return fileId
  }

  private animateFile(fileId: string) {
    const fileState = this.state.activeFiles[fileId]
    if (!fileState) return

    fileState.status = 'writing'
    this.notifyListeners()

    const interval = setInterval(() => {
      if (fileState.currentLines < fileState.totalLines) {
        // Simulate line-by-line writing with variable speed
        const linesToAdd = Math.floor(Math.random() * 3) + 1
        fileState.currentLines = Math.min(fileState.currentLines + linesToAdd, fileState.totalLines)
        fileState.linesAdded = fileState.currentLines
        fileState.progress = (fileState.currentLines / fileState.totalLines) * 100
        
        // Update project totals
        this.recalculateTotals()
        this.notifyListeners()
      } else {
        // Animation complete
        fileState.status = 'completed'
        fileState.progress = 100
        this.state.completedFiles++
        
        if (this.state.completedFiles >= this.state.totalFiles) {
          this.state.status = 'completed'
        }
        
        clearInterval(this.animationIntervals[fileId])
        delete this.animationIntervals[fileId]
        this.notifyListeners()
      }
    }, 50 + Math.random() * 100) // Variable speed for realism

    this.animationIntervals[fileId] = interval
  }

  updateFileProgress(fileId: string, currentLines: number, totalLines: number) {
    const fileState = this.state.activeFiles[fileId]
    if (!fileState) return

    const lineDiff = currentLines - fileState.currentLines
    if (lineDiff > 0) {
      fileState.linesAdded += lineDiff
      this.state.totalLinesAdded += lineDiff
    } else if (lineDiff < 0) {
      fileState.linesRemoved += Math.abs(lineDiff)
      this.state.totalLinesRemoved += Math.abs(lineDiff)
    }

    fileState.currentLines = currentLines
    fileState.totalLines = totalLines
    fileState.progress = (currentLines / totalLines) * 100
    
    this.recalculateTotals()
    this.notifyListeners()
  }

  completeFile(fileId: string) {
    const fileState = this.state.activeFiles[fileId]
    if (!fileState) return

    fileState.status = 'completed'
    fileState.progress = 100
    this.state.completedFiles++

    if (this.animationIntervals[fileId]) {
      clearInterval(this.animationIntervals[fileId])
      delete this.animationIntervals[fileId]
    }

    if (this.state.completedFiles >= this.state.totalFiles) {
      this.state.status = 'completed'
    }

    this.recalculateTotals()
    this.notifyListeners()
  }

  errorFile(fileId: string, error: string) {
    const fileState = this.state.activeFiles[fileId]
    if (!fileState) return

    fileState.status = 'error'
    
    if (this.animationIntervals[fileId]) {
      clearInterval(this.animationIntervals[fileId])
      delete this.animationIntervals[fileId]
    }

    this.notifyListeners()
  }

  private recalculateTotals() {
    this.state.totalLinesAdded = 0
    this.state.totalLinesRemoved = 0

    Object.values(this.state.activeFiles).forEach(file => {
      this.state.totalLinesAdded += file.linesAdded
      this.state.totalLinesRemoved += file.linesRemoved
    })
  }

  reset() {
    // Clear all intervals
    Object.values(this.animationIntervals).forEach(interval => clearInterval(interval))
    this.animationIntervals = {}

    this.state = {
      activeFiles: {},
      totalFiles: 0,
      completedFiles: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      startTime: 0,
      status: 'idle'
    }
    this.notifyListeners()
  }

  getState(): ProjectAnimationState {
    return { ...this.state }
  }
}

// Singleton instance
export const codeAnimationService = new CodeAnimationService()

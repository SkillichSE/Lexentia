// terminal integration with error detection per spec section 12
import { useState, useCallback, useRef } from 'react'
import type { DebugInfo } from '../components/ide/DebugMode'
import { parseDebugInfo } from '../components/ide/DebugMode'

export interface TerminalError {
  id: string
  timestamp: number
  output: string
  debugInfo: DebugInfo
  suggestedFix?: string
}

interface TerminalIntegrationOptions {
  onErrorDetected?: (error: TerminalError) => void
  autoAnalyze?: boolean
  maxHistorySize?: number
}

export function useTerminalIntegration(options: TerminalIntegrationOptions = {}) {
  const { onErrorDetected, autoAnalyze = true, maxHistorySize = 100 } = options
  const [output, setOutput] = useState<string>('')
  const [errors, setErrors] = useState<TerminalError[]>([])
  const [isListening, setIsListening] = useState(false)
  const outputBuffer = useRef<string>('')

  // analyze terminal output for errors per spec section 12.2
  const analyzeOutput = useCallback((newOutput: string) => {
    outputBuffer.current += newOutput

    // check for error patterns
    const debugInfo = parseDebugInfo(outputBuffer.current)
    if (debugInfo) {
      const error: TerminalError = {
        id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        output: outputBuffer.current,
        debugInfo
      }

      setErrors(prev => {
        const updated = [...prev, error].slice(-maxHistorySize)
        return updated
      })

      onErrorDetected?.(error)
      outputBuffer.current = '' // clear buffer after error found
      return error
    }

    return null
  }, [onErrorDetected, maxHistorySize])

  // append output and optionally analyze per spec section 12.2
  const appendOutput = useCallback((newOutput: string) => {
    setOutput(prev => prev + newOutput)

    if (autoAnalyze) {
      analyzeOutput(newOutput)
    }
  }, [autoAnalyze, analyzeOutput])

  // clear terminal output
  const clearOutput = useCallback(() => {
    setOutput('')
    outputBuffer.current = ''
  }, [])

  // clear error history
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // start listening for errors
  const startListening = useCallback(() => {
    setIsListening(true)
  }, [])

  // stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  // dismiss specific error
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId))
  }, [])

  // request fix for error - triggers AI
  const requestFix = useCallback(async (errorId: string): Promise<string | null> => {
    const error = errors.find(e => e.id === errorId)
    if (!error) return null

    // this would integrate with AI service
    // for now, return placeholder
    return `// suggested fix for ${error.debugInfo.file}:${error.debugInfo.line}\n// ${error.debugInfo.message}`
  }, [errors])

  return {
    output,
    errors,
    isListening,
    appendOutput,
    clearOutput,
    clearErrors,
    startListening,
    stopListening,
    analyzeOutput,
    dismissError,
    requestFix
  }
}

// parse command for AI assistance request
export function isAICommand(command: string): boolean {
  const aiPrefixes = ['explain', 'fix', 'help', 'analyze']
  return aiPrefixes.some(prefix => command.toLowerCase().trim().startsWith(prefix))
}

// extract intent from command
export function extractCommandIntent(command: string): {
  type: 'explain' | 'fix' | 'help' | 'none'
  target?: string
} {
  const lower = command.toLowerCase().trim()

  if (lower.startsWith('explain')) {
    return { type: 'explain', target: lower.replace('explain', '').trim() }
  }
  if (lower.startsWith('fix')) {
    return { type: 'fix', target: lower.replace('fix', '').trim() }
  }
  if (lower.startsWith('help')) {
    return { type: 'help' }
  }

  return { type: 'none' }
}

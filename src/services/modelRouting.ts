// model routing based on task complexity per spec section 10
import { useState, useCallback } from 'react'

export type ModelSize = 'small' | 'medium' | 'large'

export interface ModelConfig {
  id: string
  name: string
  size: ModelSize
  baseUrl: string
  model: string
  maxTokens: number
}

export interface Task {
  type: 'ask' | 'edit' | 'debug' | 'agent'
  complexity: 'simple' | 'medium' | 'complex'
  estimatedTokens: number
  requiresReasoning: boolean
}

// select model based on task complexity per spec section 10.2
export function selectModel(task: Task, availableModels: ModelConfig[]): ModelConfig | null {
  if (availableModels.length === 0) return null

  // simple tasks -> small model
  if (task.complexity === 'simple' || task.estimatedTokens < 1000) {
    const small = availableModels.find(m => m.size === 'small')
    if (small) return small
  }

  // complex tasks or reasoning required -> large model
  if (task.complexity === 'complex' || task.requiresReasoning) {
    const large = availableModels.find(m => m.size === 'large')
    if (large) return large
  }

  // default to first available
  return availableModels[0]
}

// estimate task complexity from prompt
export function estimateTaskComplexity(prompt: string, mode: Task['type']): Task {
  const tokens = Math.ceil(prompt.length / 4)

  // detect complexity indicators
  const hasCodeBlocks = /```[\s\S]*```/.test(prompt)
  const hasMultipleFiles = /@file|@folder|@codebase/.test(prompt)
  const hasDebugKeywords = /fix|error|bug|debug|broken/.test(prompt.toLowerCase())
  const hasArchitecturalKeywords = /architecture|design|refactor|structure/.test(prompt.toLowerCase())

  let complexity: Task['complexity'] = 'simple'
  if (hasArchitecturalKeywords || hasMultipleFiles || tokens > 2000) {
    complexity = 'complex'
  } else if (hasCodeBlocks || hasDebugKeywords || tokens > 500) {
    complexity = 'medium'
  }

  return {
    type: mode,
    complexity,
    estimatedTokens: tokens,
    requiresReasoning: hasArchitecturalKeywords || mode === 'agent'
  }
}

// hook for model routing
export function useModelRouting(availableModels: ModelConfig[]) {
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null)
  const [lastTask, setLastTask] = useState<Task | null>(null)

  const routeTask = useCallback((prompt: string, mode: Task['type']) => {
    const task = estimateTaskComplexity(prompt, mode)
    const model = selectModel(task, availableModels)
    setLastTask(task)
    setCurrentModel(model)
    return { task, model }
  }, [availableModels])

  const manualSelect = useCallback((modelId: string) => {
    const model = availableModels.find(m => m.id === modelId)
    setCurrentModel(model || null)
    return model || null
  }, [availableModels])

  const getRoutingLabel = useCallback((): string => {
    if (!currentModel) return 'no model'
    return `model: ${currentModel.size}`
  }, [currentModel])

  return {
    currentModel,
    lastTask,
    routeTask,
    manualSelect,
    getRoutingLabel
  }
}

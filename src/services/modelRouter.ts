// enhanced model router per optimization spec section 6
// select appropriate model based on task complexity

import type { Intent } from './intentParser'

export type ModelSize = 'small' | 'medium' | 'large' // 8b, 30b, 120b

export interface ModelConfig {
  id: string
  name: string
  size: ModelSize
  baseUrl: string
  model: string
  maxTokens: number
}

// task complexity assessment per spec section 6.3
function assessComplexity(intent: Intent): 'low' | 'medium' | 'high' {
  switch (intent.type) {
    case 'explain':
      return 'low'
    case 'fix':
      return 'medium'
    case 'generate':
      return intent.scope === 'project' ? 'high' : 'medium'
    case 'agent':
      return 'high'
    case 'ask':
      return 'low'
    default:
      return 'medium'
  }
}

// recommended model mapping per spec section 6.3
const COMPLEXITY_MODEL_MAP: Record<'low' | 'medium' | 'high', ModelSize> = {
  low: 'small',      // 8b
  medium: 'small',   // 8b (can use medium 30b if available)
  high: 'large'      // 120b
}

// select model based on intent and available models
export function selectModel(
  intent: Intent,
  availableModels: ModelConfig[],
  fallbackToLarger: boolean = true
): ModelConfig | null {
  if (availableModels.length === 0) return null

  const complexity = assessComplexity(intent)
  const preferredSize = COMPLEXITY_MODEL_MAP[complexity]

  // try to find exact match
  let selected = availableModels.find(m => m.size === preferredSize)

  // if not found and fallback is enabled, try larger model
  if (!selected && fallbackToLarger) {
    const sizeOrder: ModelSize[] = ['small', 'medium', 'large']
    const preferredIndex = sizeOrder.indexOf(preferredSize)

    for (let i = preferredIndex + 1; i < sizeOrder.length; i++) {
      selected = availableModels.find(m => m.size === sizeOrder[i])
      if (selected) break
    }
  }

  // if still not found, try smaller model
  if (!selected && fallbackToLarger) {
    const sizeOrder: ModelSize[] = ['small', 'medium', 'large']
    const preferredIndex = sizeOrder.indexOf(preferredSize)

    for (let i = preferredIndex - 1; i >= 0; i--) {
      selected = availableModels.find(m => m.size === sizeOrder[i])
      if (selected) break
    }
  }

  // final fallback: first available
  if (!selected) {
    selected = availableModels[0]
  }

  return selected
}

// retry strategy per spec section 6.4
export function shouldRetryWithLargerModel(
  intent: Intent,
  currentModel: ModelConfig,
  error?: string,
  outputQuality?: 'poor' | 'good'
): boolean {
  // if current model is already large, don't retry
  if (currentModel.size === 'large') return false

  // retry on certain errors
  if (error && (
    error.includes('context length exceeded') ||
    error.includes('too long') ||
    error.includes('complex')
  )) {
    return true
  }

  // retry if output quality is poor
  if (outputQuality === 'poor') {
    return true
  }

  // retry for high complexity tasks with small models
  if (assessComplexity(intent) === 'high' && currentModel.size === 'small') {
    return true
  }

  return false
}

// get next larger model for retry
export function getNextLargerModel(
  currentModel: ModelConfig,
  availableModels: ModelConfig[]
): ModelConfig | null {
  const sizeOrder: ModelSize[] = ['small', 'medium', 'large']
  const currentIndex = sizeOrder.indexOf(currentModel.size)

  if (currentIndex >= sizeOrder.length - 1) return null

  for (let i = currentIndex + 1; i < sizeOrder.length; i++) {
    const larger = availableModels.find(m => m.size === sizeOrder[i])
    if (larger) return larger
  }

  return null
}

// model selector hook
export function useModelRouter(availableModels: ModelConfig[]) {
  return {
    select: (intent: Intent, fallbackToLarger?: boolean) =>
      selectModel(intent, availableModels, fallbackToLarger),
    shouldRetry: (
      intent: Intent,
      currentModel: ModelConfig,
      error?: string,
      outputQuality?: 'poor' | 'good'
    ) => shouldRetryWithLargerModel(intent, currentModel, error, outputQuality),
    getNextLarger: (currentModel: ModelConfig) =>
      getNextLargerModel(currentModel, availableModels)
  }
}

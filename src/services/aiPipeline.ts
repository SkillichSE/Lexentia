// ai pipeline integration per optimization spec
// orchestrates all components: intent -> context -> prompt -> model -> post-process

import { parseIntent, parseIntentSync, type Intent } from './intentParser'
import {
  buildContext,
  getAdaptiveBudget,
  formatContext,
  compressFile,
  type ContextFile
} from './contextEngine'
import { buildPrompt, buildSystemPrompt } from './promptBuilder'
import { selectModel, shouldRetryWithLargerModel, getNextLargerModel, type ModelConfig, type ModelSize } from './modelRouter'
import { cleanOutput, parseDiff, validateChanges, extractCode, type FileChange } from './postProcessor'
import { createProjectMemory, formatProjectMemory, addProjectRule, type ProjectMemory } from './memorySystem'
import { createResponseCache, hashContext, createPerformanceMonitor } from './performance'

// pipeline configuration
export interface PipelineConfig {
  models: ModelConfig[]
  projectMemory?: ProjectMemory
  enableCache?: boolean
  enableStreaming?: boolean
  maxRetries?: number
}

// pipeline result
export interface PipelineResult {
  intent: Intent
  model: ModelConfig
  prompt: string
  output: string
  changes: FileChange[]
  valid: boolean
  errors: string[]
  fromCache: boolean
  duration: number
}

// model interface
export interface ModelInterface {
  generate: (prompt: string, systemPrompt?: string) => Promise<string>
  stream?: (prompt: string, onChunk: (chunk: string) => void, systemPrompt?: string) => Promise<string>
}

// main ai pipeline per spec architecture
export async function runAIPipeline(
  input: string,
  files: ContextFile[],
  modelInterface: ModelInterface,
  config: PipelineConfig
): Promise<PipelineResult> {
  const startTime = performance.now()
  const monitor = createPerformanceMonitor()

  // step 1: parse intent (fast rule-based or small model)
  const intentStart = performance.now()
  const intent = parseIntentSync(input) // use sync version for speed
  monitor.record('intent-parse', performance.now() - intentStart)

  // step 2: select model based on intent
  const selectedModel = selectModel(intent, config.models, true)
  if (!selectedModel) {
    throw new Error('no model available')
  }

  const modelSize: ModelSize = selectedModel.size === 'small' ? 'small' : 'large'

  // step 3: build context within budget
  const contextStart = performance.now()
  const budget = getAdaptiveBudget(modelSize)
  const contextResult = buildContext(files, input, budget, modelSize)
  monitor.record('context-build', performance.now() - contextStart)

  // step 4: check cache
  const cache = config.enableCache !== false ? createResponseCache() : null
  const contextHash = hashContext(formatContext(contextResult.files))
  let output = ''
  let fromCache = false

  if (cache) {
    const cached = cache.get(input, contextHash)
    if (cached) {
      output = cached
      fromCache = true
    }
  }

  // step 5: build prompt
  const promptStart = performance.now()
  const prompt = buildPrompt({
    intent,
    context: contextResult.files,
    code: files.find(f => f.relevance > 0.8)?.content, // use most relevant file as code
    modelSize
  })

  // inject project memory if available
  const systemPrompt = [
    buildSystemPrompt(modelSize),
    config.projectMemory ? formatProjectMemory(config.projectMemory) : ''
  ].filter(Boolean).join('\n\n')

  monitor.record('prompt-build', performance.now() - promptStart)

  // step 6: generate with model (with retry logic)
  const generateStart = performance.now()
  let retries = 0
  let currentModel = selectedModel
  let lastError: Error | undefined

  while (!fromCache) {
    try {
      output = await modelInterface.generate(prompt, systemPrompt)
      break
    } catch (error) {
      lastError = error as Error
      retries++

      // check if we should retry with larger model
      if (retries <= (config.maxRetries || 2) &&
          shouldRetryWithLargerModel(intent, currentModel, lastError.message)) {
        const nextModel = getNextLargerModel(currentModel, config.models)
        if (nextModel) {
          currentModel = nextModel
          continue
        }
      }

      throw error
    }
  }

  monitor.record('model-generate', performance.now() - generateStart)

  // step 7: post-process output
  const postStart = performance.now()
  output = cleanOutput(output)

  // parse changes from output
  const changes = parseDiff(output)

  // validate changes
  const validation = validateChanges(changes)

  // extract code if no changes found (e.g., for explain)
  if (changes.length === 0 && intent.type === 'explain') {
    output = extractCode(output)
  }

  monitor.record('post-process', performance.now() - postStart)

  // cache the result
  if (cache && !fromCache) {
    cache.set(input, contextHash, output, 5 * 60 * 1000) // 5 min ttl
  }

  const duration = performance.now() - startTime

  return {
    intent,
    model: currentModel,
    prompt,
    output,
    changes,
    valid: validation.valid,
    errors: validation.errors,
    fromCache,
    duration
  }
}

// streaming version of pipeline per spec section 7
export async function runStreamingAIPipeline(
  input: string,
  files: ContextFile[],
  modelInterface: ModelInterface,
  config: PipelineConfig,
  onChunk: (chunk: string) => void
): Promise<Omit<PipelineResult, 'output'> & { output: string }> {
  const startTime = performance.now()

  // steps 1-5: same as non-streaming
  const intent = parseIntentSync(input)
  const selectedModel = selectModel(intent, config.models, true)
  if (!selectedModel) {
    throw new Error('no model available')
  }

  const modelSize: ModelSize = selectedModel.size === 'small' ? 'small' : 'large'
  const budget = getAdaptiveBudget(modelSize)
  const contextResult = buildContext(files, input, budget, modelSize)

  const prompt = buildPrompt({
    intent,
    context: contextResult.files,
    code: files.find(f => f.relevance > 0.8)?.content,
    modelSize
  })

  const systemPrompt = [
    buildSystemPrompt(modelSize),
    config.projectMemory ? formatProjectMemory(config.projectMemory) : ''
  ].filter(Boolean).join('\n\n')

  // step 6: stream generation
  let fullOutput = ''

  if (modelInterface.stream) {
    fullOutput = await modelInterface.stream(prompt, (chunk) => {
      onChunk(chunk)
      fullOutput += chunk
    }, systemPrompt)
  } else {
    // fallback to non-streaming
    fullOutput = await modelInterface.generate(prompt, systemPrompt)
    onChunk(fullOutput)
  }

  // step 7: post-process
  fullOutput = cleanOutput(fullOutput)
  const changes = parseDiff(fullOutput)
  const validation = validateChanges(changes)

  if (changes.length === 0 && intent.type === 'explain') {
    fullOutput = extractCode(fullOutput)
  }

  const duration = performance.now() - startTime

  return {
    intent,
    model: selectedModel,
    prompt,
    output: fullOutput,
    changes,
    valid: validation.valid,
    errors: validation.errors,
    fromCache: false,
    duration
  }
}

// simplified pipeline for quick operations
export async function quickAIOperation(
  input: string,
  code: string,
  modelInterface: ModelInterface,
  smallModel: ModelConfig
): Promise<string> {
  const intent = parseIntentSync(input)

  // force small model for speed
  const prompt = buildPrompt({
    intent,
    context: [],
    code,
    modelSize: 'small'
  })

  const systemPrompt = buildSystemPrompt('small')
  const output = await modelInterface.generate(prompt, systemPrompt)

  return cleanOutput(output)
}

// export all components
export {
  parseIntent,
  parseIntentSync,
  buildContext,
  getAdaptiveBudget,
  formatContext,
  compressFile,
  buildPrompt,
  buildSystemPrompt,
  selectModel,
  cleanOutput,
  parseDiff,
  validateChanges,
  extractCode,
  createProjectMemory,
  formatProjectMemory,
  addProjectRule,
  createResponseCache,
  hashContext,
  createPerformanceMonitor
}

export type {
  Intent,
  ContextFile,
  ModelConfig,
  ModelSize,
  FileChange,
  ProjectMemory
}

// prompt builder per optimization spec section 5
// task-specific prompts, no generic prompts

import type { Intent } from './intentParser'
import type { ContextFile } from './contextEngine'

export type PromptTemplate = 'explain' | 'fix' | 'generate' | 'agent' | 'ask'

// templates per spec section 5.2
const TEMPLATES: Record<PromptTemplate, string> = {
  explain: `explain the following code.

rules:
- be concise
- no unnecessary text
- focus on what the code does, not how

{{context}}

code:
{{code}}`,

  fix: `fix the bug in the code.

rules:
- return only fixed code
- do not explain the fix
- preserve code style and formatting

{{context}}

code:
{{code}}

{{error}}`,

  generate: `generate code based on the request.

rules:
- write clean, well-structured code
- include necessary imports
- follow best practices for the language

{{context}}

request:
{{description}}`,

  agent: `perform the following task:

{{task}}

{{context}}

rules:
- return a unified diff format
- do not explain the changes
- ensure changes are minimal and correct`,

  ask: `answer the following question about the codebase.

rules:
- be concise and accurate
- reference specific files when relevant
- if unsure, say so

{{context}}

question:
{{question}}`
}

// model-specific prompt adjustments per spec section 5.3
function adjustForModelSize(template: string, modelSize: 'small' | 'large'): string {
  if (modelSize === 'small') {
    // for 8b models: shorter, more explicit
    return template.replace(/rules:\n-[^\n]+\n-[^\n]+\n-[^\n]+/g, 'rules: be concise, return only code, no explanation')
  }
  // for 120b models: allow more flexibility
  return template
}

interface BuildPromptOptions {
  intent: Intent
  context: ContextFile[]
  code?: string
  error?: string
  modelSize: 'small' | 'large'
}

// build prompt based on intent and context per spec section 5
export function buildPrompt(options: BuildPromptOptions): string {
  const { intent, context, code, error, modelSize } = options

  // select template based on intent
  let template: PromptTemplate
  switch (intent.type) {
    case 'explain':
      template = 'explain'
      break
    case 'fix':
      template = 'fix'
      break
    case 'generate':
      template = 'generate'
      break
    case 'agent':
      template = 'agent'
      break
    default:
      template = 'ask'
  }

  let prompt = TEMPLATES[template]

  // format context
  const contextStr = context.length > 0
    ? context.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
    : 'no additional context provided'

  // replace placeholders
  prompt = prompt.replace('{{context}}', contextStr)

  if (code) {
    prompt = prompt.replace('{{code}}', code)
  }

  if (error) {
    prompt = prompt.replace('{{error}}', `error:\n${error}`)
  } else {
    prompt = prompt.replace('\n{{error}}', '')
  }

  if (intent.type === 'generate') {
    prompt = prompt.replace('{{description}}', intent.description)
  }

  if (intent.type === 'agent') {
    prompt = prompt.replace('{{task}}', intent.task)
  }

  if (intent.type === 'ask') {
    prompt = prompt.replace('{{question}}', intent.question)
  }

  if (intent.type === 'explain') {
    prompt = prompt.replace('{{code}}', code || intent.code || 'no code provided')
  }

  if (intent.type === 'fix') {
    prompt = prompt.replace('{{code}}', code || 'no code provided')
    if (error || intent.error) {
      prompt = prompt.replace('{{error}}', `error:\n${error || intent.error}`)
    } else {
      prompt = prompt.replace('\n{{error}}', '')
    }
  }

  // adjust for model size
  prompt = adjustForModelSize(prompt, modelSize)

  return prompt.trim()
}

// system prompt based on model size
export function buildSystemPrompt(modelSize: 'small' | 'large'): string {
  if (modelSize === 'small') {
    return `you are a coding assistant. rules:
- be extremely concise
- return only code when asked for code
- no explanations unless explicitly asked
- one sentence answers for questions`
  }

  return `you are an expert coding assistant. rules:
- provide accurate, helpful responses
- write clean, idiomatic code
- explain complex concepts clearly
- follow best practices`
}

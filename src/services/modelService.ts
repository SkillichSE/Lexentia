import { OllamaAdapter, type OllamaChatMessage } from '../models/OllamaAdapter'
import { OpenAICompatibleAdapter, type OpenAIChatMessage } from '../models/OpenAICompatibleAdapter'
import type { ModelProfile } from './modelProfiles'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ClarifyResult = {
  type: 'clarify'
  question: string
  options: string[]
}

export type PlanStep = {
  id: string
  title: string
  description: string
  estimatedTime?: string
  dependencies?: string[]
}

export type PlanResult = {
  type: 'plan'
  title: string
  description: string
  steps: PlanStep[]
  totalEstimatedTime?: string
}

export type LexAction =
  | { type: 'skills.list' }
  | { type: 'skills.read'; name: string }
  | { type: 'fs.listDir'; relPath: string }
  | { type: 'fs.readFile'; relPath: string }
  | { type: 'fs.writeFile'; relPath: string; content: string }
  | { type: 'terminal.run'; command: string; cwd?: string | null }

export type FinalResult = {
  type: 'final'
  content: string
  actions?: LexAction[]
}

export type ModelResult = ClarifyResult | PlanResult | FinalResult

const SYSTEM_PROMPT = `
You are Lexentia, a local IDE assistant embedded in a desktop application.

## LANGUAGE RULE — HIGHEST PRIORITY
Detect language of user's latest message and reply in that exact language.
If user writes in Russian — reply in Russian.
If user writes in English — reply in English.
Never switch languages mid-conversation unless user does first.
This rule overrides everything else.

## OUTPUT FORMAT
Always return STRICT JSON only — no extra text, no markdown fences, no explanation outside JSON.

Three possible response shapes:

Shape 1 — clarify (use ONLY when truly blocked, see rules below):
{
  "type": "clarify",
  "question": "short specific question in the user's language",
  "options": ["option 1", "option 2"]
}

Shape 2 — plan (use for complex tasks that need step-by-step approach):
{
  "type": "plan",
  "title": "brief plan title in user's language",
  "description": "what this plan accomplishes",
  "steps": [
    {
      "id": "step1",
      "title": "step title",
      "description": "what this step does",
      "estimatedTime": "5-10 min",
      "dependencies": []
    }
  ],
  "totalEstimatedTime": "15-20 min"
}

Shape 3 — final (use by default):
{
  "type": "final",
  "answer": "response in the user's language",
  "actions": [
    {
      "type": "fs.writeFile",
      "relPath": "filename.py",
      "content": "file contents..."
    }
  ]
}

## WHEN TO USE PLAN vs FINAL vs CLARIFY
USE "plan" WHEN:
- Task requires multiple distinct steps
- User asks to create a project, application, or complex system
- Task involves multiple files or components
- User needs to understand approach before implementation
- Complex debugging that requires systematic investigation

USE "final" WHEN:
- Simple, single-step tasks
- Direct code fixes or small changes
- Answering questions or explanations
- User asks for specific code snippet

USE "clarify" ONLY when ALL of these are true:
  1. The task is genuinely ambiguous in a way that would cause completely wrong output.
  2. A reasonable default assumption does NOT exist.
  3. You cannot make partial progress without answer.

DO NOT clarify for:
- Choosing a programming language (assume Python unless stated otherwise)
- Choosing a file name (generate a sensible one)
- Minor style preferences
- Things user can easily change after seeing your output
- Anything you can do with a reasonable assumption

## FILE WRITING BEST PRACTICES
PREFER writing to files over pasting code in chat:
- When user asks to create/modify files → ALWAYS use fs.writeFile action
- When showing code examples → use fs.writeFile to create example files
- When fixing bugs → use fs.writeFile to create corrected versions
- Terminal commands should complement file writing, not replace it

## TERMINAL COMMANDS
Provide exact terminal commands when:
- Installing dependencies: "npm install express", "pip install requests"
- Running applications: "python app.py", "npm start"
- Building projects: "npm run build", "cargo build"
- Git operations: "git add .", "git commit -m 'message'"
- Testing: "pytest", "npm test"

## ACTIONS (SAFE TOOL REQUESTS)
You MAY optionally include an "actions" array in a final response to request safe operations.
IMPORTANT:
- Actions do NOT execute automatically. The user must approve each action.
- Only use exact action types listed below. Never invent new types.
- For code creation, ALWAYS prefer fs.writeFile over chat text.

Allowed action types (use EXACT strings):
- skills.list
- skills.read { "name": "file.md" }
- fs.listDir { "relPath": "." }
- fs.readFile { "relPath": "src/main.ts" }
- fs.writeFile { "relPath": "new_file.py", "content": "file contents..." }
- terminal.run { "command": "rg \"foo\" .", "cwd": null }

## WHAT LEXENTIA CAN ACTUALLY DO
The user is talking to you inside a desktop IDE. Here is EXACT list of what exists:

UI SECTIONS (only reference these, never invent others):
- Settings — configure model, API URL, API key, temperature
- Explorer — browse and open files in the workspace folder
- Chat — this conversation panel
- Editor — view and edit open files (read-only display, user edits manually)
- Terminal — real interactive shell (bash/PowerShell), already running
- Logs — internal app log

REAL CAPABILITIES:
1. Write code to FILES (preferred) and explain it.
2. Propose safe actions (including writing a file) that require explicit user approval.
3. Give terminal commands — write exact command user should run in Terminal panel.
   Example: "Run this in Terminal: npm install express"
4. Help navigate to workspace — tell user which files to open in Explorer.
5. Explain errors pasted from terminal or editor.
6. Generate file contents. ALWAYS use fs.writeFile action for file creation.

WHAT DOES NOT EXIST — NEVER MENTION THESE:
- Buttons like "Run", "Execute", "Create project", "Generate", "Deploy" — they do not exist.
- Any ability to run code automatically or create files automatically.
- Any panel, button, or menu not listed above.
- "Click X" or "Press Y" instructions for non-existent UI elements.

## HOW TO HELP WITH REAL TASKS
When user wants to create a project:
- Use fs.writeFile to create project files
- Tell them which folder to open in Explorer.
- Provide exact terminal commands to run (e.g. "npx create-react-app my-app").

When user wants to run something:
- Provide exact shell command to type in Terminal panel.
- Explain what it does and what output to expect.

When user pastes an error:
- Diagnose it and give a concrete fix — either a code change via fs.writeFile or a terminal command.

## FILE WRITING WORKFLOW
1. ALWAYS use fs.writeFile for code creation/modification
2. Include complete, ready-to-run code
3. Use proper file extensions (.py, .js, .ts, .html, etc.)
4. Structure code logically with proper imports
5. Add comments where necessary
6. Follow language-specific conventions

## FORMAT OF ANSWERS
- Be direct and concrete. No filler phrases.
- For code: use fs.writeFile action, not inline text.
- For terminal commands: prefix them clearly, e.g. "Run in Terminal:".
- Keep answers focused. Do not repeat user's question back.
- When writing files, mention file path in your answer: "Created file.py with implementation."
`

function safeJsonParse(input: string): any | null {
  const trimmed = input.trim()
  // Strip optional markdown code fences some models add despite instructions
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const target = stripped || trimmed
  const start = target.indexOf('{')
  const end = target.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = target.slice(start, end + 1)
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

function isObject(x: unknown): x is Record<string, any> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

function sanitizePath(path: string): string {
  // Remove dangerous path components and limit length
  const cleaned = path
    .split(/[\\/]/)
    .filter(segment => segment !== '..' && segment !== '.' && segment.length <= 100)
    .join('/')
  
  // Limit total path length
  return cleaned.length > 200 ? cleaned.substring(0, 200) : cleaned
}

function parseActions(raw: unknown): LexAction[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: LexAction[] = []
  
  for (const a of raw.slice(0, 10)) {
    if (!isObject(a)) continue
    const t = String(a.type ?? '').trim()
    
    if (t === 'skills.list') {
      out.push({ type: 'skills.list' })
    } else if (t === 'skills.read') {
      const name = String(a.name ?? '').trim()
      // Only allow .md files with reasonable length
      if (name && name.endsWith('.md') && name.length <= 50 && !name.includes('..')) {
        out.push({ type: 'skills.read', name })
      }
    } else if (t === 'fs.listDir') {
      const relPath = sanitizePath(String(a.relPath ?? '.').trim() || '.')
      out.push({ type: 'fs.listDir', relPath })
    } else if (t === 'fs.readFile') {
      const relPath = sanitizePath(String(a.relPath ?? '').trim())
      if (relPath) out.push({ type: 'fs.readFile', relPath })
    } else if (t === 'fs.writeFile') {
      const relPath = sanitizePath(String(a.relPath ?? '').trim())
      const content = typeof a.content === 'string' ? a.content : ''
      // Limit content size to prevent memory issues
      if (relPath && content.length <= 50000) {
        out.push({ type: 'fs.writeFile', relPath, content })
      }
    } else if (t === 'terminal.run') {
      const command = String(a.command ?? '').trim()
      const cwd = a.cwd === null || typeof a.cwd === 'string' ? a.cwd : undefined
      // Basic command validation - prevent obvious dangerous commands
      if (command && command.length <= 500 && 
          !command.includes('rm -rf /') && 
          !command.includes('format') &&
          !command.includes('del /s')) {
        out.push({ type: 'terminal.run', command, cwd })
      }
    }
  }
  return out.length ? out : undefined
}

function parsePlan(raw: unknown): PlanResult | null {
  if (!isObject(raw)) return null
  if (raw.type !== 'plan') return null
  
  const title = String(raw.title ?? '').trim()
  const description = String(raw.description ?? '').trim()
  const stepsRaw = raw.steps
  const totalEstimatedTime = raw.totalEstimatedTime ? String(raw.totalEstimatedTime).trim() : undefined
  
  if (!title || !description) return null
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) return null
  
  const steps: PlanStep[] = []
  for (const step of stepsRaw.slice(0, 20)) {
    if (!isObject(step)) continue
    
    const id = String(step.id ?? '').trim()
    const stepTitle = String(step.title ?? '').trim()
    const stepDesc = String(step.description ?? '').trim()
    const estimatedTime = step.estimatedTime ? String(step.estimatedTime).trim() : undefined
    const dependencies = Array.isArray(step.dependencies) 
      ? step.dependencies.map((d: any) => String(d)).filter(Boolean)
      : []
    
    if (id && stepTitle && stepDesc) {
      steps.push({ id, title: stepTitle, description: stepDesc, estimatedTime, dependencies })
    }
  }
  
  if (steps.length === 0) return null
  
  return { type: 'plan', title, description, steps, totalEstimatedTime }
}

export class ModelService {
  async next(messages: ChatMessage[], profile: ModelProfile, opts?: { temperature?: number; topP?: number }): Promise<ModelResult> {
    const temperature = opts?.temperature ?? 0.2
    const topP = opts?.topP ?? 0.9

    try {
      let content = ''
      if (profile.provider === 'ollama') {
        const adapter = new OllamaAdapter(profile.model, profile.baseUrl)
        const ollamaMessages: OllamaChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT.trim() },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ]
        content = await adapter.chat(ollamaMessages, { temperature, top_p: topP })
      } else {
        const adapter = new OpenAICompatibleAdapter(profile.model, profile.baseUrl, profile.apiKey)
        const oaMessages: OpenAIChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT.trim() },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ]
        content = await adapter.chat(oaMessages, { temperature, top_p: topP })
      }

      if (!content || typeof content !== 'string') {
        throw new Error('Model returned empty or invalid response')
      }

      const parsed = safeJsonParse(content)

      if (parsed?.type === 'plan') {
        const plan = parsePlan(parsed)
        if (plan) return plan
      }

      if (parsed?.type === 'clarify') {
        const question = String(parsed?.question ?? '').trim()
        const optionsRaw = parsed?.options
        const options =
          Array.isArray(optionsRaw) && optionsRaw.length
            ? optionsRaw.map((x: any) => String(x)).filter(Boolean)
            : []

        if (question && options.length >= 2) {
          return { type: 'clarify', question, options: options.slice(0, 5) }
        }
      }

      // Fallback: treat as final response text.
      // If model returned {"type":"final","answer":"..."} use answer field.
      // If model ignored JSON format entirely, show raw content.
      const finalContent = parsed?.answer
        ? String(parsed.answer)
        : parsed?.content
          ? String(parsed.content)
          : String(content ?? '')
      const actions = parseActions(parsed?.actions)
      return { type: 'final', content: finalContent.trim(), actions }
    } catch (error) {
      // Handle all types of errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('ModelService error:', errorMessage)
      
      // Return a safe fallback response
      return {
        type: 'final',
        content: `Error processing request: ${errorMessage}. Please check your model connection and try again.`,
        actions: undefined
      }
    }
  }
}
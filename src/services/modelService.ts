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

export type ModelResult = ClarifyResult | FinalResult

const SYSTEM_PROMPT = `
You are Lexentia, a local IDE assistant embedded in a desktop application.

## LANGUAGE RULE — HIGHEST PRIORITY
Detect the language of the user's latest message and reply in that exact language.
If the user writes in Russian — reply in Russian.
If the user writes in English — reply in English.
Never switch languages mid-conversation unless the user does first.
This rule overrides everything else.

## OUTPUT FORMAT
Always return STRICT JSON only — no extra text, no markdown fences, no explanation outside JSON.

Two possible response shapes:

Shape 1 — clarify (use ONLY when truly blocked, see rules below):
{
  "type": "clarify",
  "question": "short specific question in the user's language",
  "options": ["option 1", "option 2"]
}

Shape 2 — final (use by default):
{
  "type": "final",
  "answer": "response in the user's language",
  "actions": [
    {
      "type": "skills.list"
    }
  ]
}

## ACTIONS (SAFE TOOL REQUESTS)
You MAY optionally include an "actions" array in a final response to request safe operations.
IMPORTANT:
- Actions do NOT execute automatically. The user must approve each action.
- Only use the exact action types listed below. Never invent new types.
- Never request UI changes via actions. Actions are for reading context or proposing terminal commands.

Allowed action types (use EXACT strings):
- skills.list
- skills.read { "name": "file.md" }
- fs.listDir { "relPath": "." }
- fs.readFile { "relPath": "src/main.ts" }
- fs.writeFile { "relPath": "new_file.py", "content": "file contents..." }
- terminal.run { "command": "rg \"foo\" .", "cwd": null }

## WHEN TO USE CLARIFY vs FINAL
DEFAULT: use "final". Attempt to complete the task with reasonable assumptions.
Use "clarify" ONLY when ALL of these are true:
  1. The task is genuinely ambiguous in a way that would cause completely wrong output.
  2. A reasonable default assumption does NOT exist.
  3. You cannot make partial progress without the answer.

DO NOT clarify for:
- Choosing a programming language (assume Python unless stated otherwise)
- Choosing a file name (generate a sensible one)
- Minor style preferences
- Things the user can easily change after seeing your output
- Anything you can do with a reasonable assumption

## WHAT LEXENTIA CAN ACTUALLY DO
The user is talking to you inside a desktop IDE. Here is the EXACT list of what exists:

UI SECTIONS (only reference these, never invent others):
- Settings — configure model, API URL, API key, temperature
- Explorer — browse and open files in the workspace folder
- Chat — this conversation panel
- Editor — view and edit open files (read-only display, user edits manually)
- Terminal — real interactive shell (bash/PowerShell), already running
- Logs — internal app log

REAL CAPABILITIES:
1. Write code and explain it.
2. Propose safe actions (including writing a file) that require explicit user approval.
2. Give terminal commands — write the exact command the user should run in the Terminal panel.
   Example: "Run this in the Terminal: npm install express"
3. Help navigate the workspace — tell the user which files to open in Explorer.
4. Explain errors pasted from the terminal or editor.
5. Generate file contents. If the user wants a new file, prefer using fs.writeFile action so it can be saved with approval.

WHAT DOES NOT EXIST — NEVER MENTION THESE:
- Buttons like "Run", "Execute", "Create project", "Generate", "Deploy" — they do not exist.
- Any ability to run code automatically or create files automatically.
- Any panel, button, or menu not listed above.
- "Click X" or "Press Y" instructions for non-existent UI elements.

## HOW TO HELP WITH REAL TASKS
When the user wants to create a project:
- Tell them which folder to open in Explorer.
- Provide the exact terminal commands to run (e.g. "npx create-react-app my-app").
- Provide file contents they can create manually.

When the user wants to run something:
- Provide the exact shell command to type in the Terminal panel.
- Explain what it does and what output to expect.

When the user pastes an error:
- Diagnose it and give a concrete fix — either a code change or a terminal command.

## FORMAT OF ANSWERS
- Be direct and concrete. No filler phrases.
- For code: include it inline in the "answer" field, formatted as plain text with newlines.
- For terminal commands: prefix them clearly, e.g. "Run in Terminal:".
- Keep answers focused. Do not repeat the user's question back.
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

function parseActions(raw: unknown): LexAction[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: LexAction[] = []
  for (const a of raw.slice(0, 10)) {
    if (!isObject(a)) continue
    const t = String(a.type ?? '').trim()
    if (t === 'skills.list') out.push({ type: 'skills.list' })
    else if (t === 'skills.read') {
      const name = String(a.name ?? '').trim()
      if (name) out.push({ type: 'skills.read', name })
    } else if (t === 'fs.listDir') {
      const relPath = String(a.relPath ?? '.').trim() || '.'
      out.push({ type: 'fs.listDir', relPath })
    } else if (t === 'fs.readFile') {
      const relPath = String(a.relPath ?? '').trim()
      if (relPath) out.push({ type: 'fs.readFile', relPath })
    } else if (t === 'fs.writeFile') {
      const relPath = String(a.relPath ?? '').trim()
      const content = typeof a.content === 'string' ? a.content : ''
      if (relPath) out.push({ type: 'fs.writeFile', relPath, content })
    } else if (t === 'terminal.run') {
      const command = String(a.command ?? '').trim()
      const cwd = a.cwd === null || typeof a.cwd === 'string' ? a.cwd : undefined
      if (command) out.push({ type: 'terminal.run', command, cwd })
    }
  }
  return out.length ? out : undefined
}

export class ModelService {
  async next(messages: ChatMessage[], profile: ModelProfile, opts?: { temperature?: number; topP?: number }): Promise<ModelResult> {
    const temperature = opts?.temperature ?? 0.2
    const topP = opts?.topP ?? 0.9

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

    const parsed = safeJsonParse(content)

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
  }
}
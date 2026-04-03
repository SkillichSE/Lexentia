import { OllamaAdapter, type OllamaChatMessage } from '../models/OllamaAdapter'
import { OpenAICompatibleAdapter, type OpenAIChatMessage } from '../models/OpenAICompatibleAdapter'
import type { ModelProfile } from './modelProfiles'
import { detectModelSize, optimizeContextForModel, smartTruncate, getBudgetForModel, estimateTokens } from './contextOptimizer'

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

export type FinalResult = {
  type: 'final'
  content: string
}

export type PlanResult = {
  type: 'plan'
  title?: string
  introduction?: string
  steps: string[]
}

export type ModelResult = ClarifyResult | FinalResult | PlanResult

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

Possible response shapes:

Shape 1 — clarify (use ONLY when truly blocked, see rules below):
{
  "type": "clarify",
  "question": "short specific question in the user's language",
  "options": ["option 1", "option 2"]
}

Shape 2 — plan (use when the task is complex and needs multiple ordered steps; the UI will show steps and ask the user to Allow or Reject before execution):
{
  "type": "plan",
  "title": "short plan title in the user's language",
  "introduction": "1–3 sentences: why this is split into steps",
  "steps": ["step 1 concrete action", "step 2", "step 3"]
}
Rules for plan:
- At least 2 steps, at most 12 steps. Each step is one clear action.
- Do NOT include Allow/Reject in JSON; the app provides those buttons.
- After the user approves, you will later receive messages to execute one step at a time.

Shape 3 — final (use by default for simple tasks):
{
  "type": "final",
  "answer": "response in the user's language"
}

## WHEN TO USE PLAN vs FINAL vs CLARIFY
Use "plan" when the user asks for something that clearly requires several sequential steps (e.g. set up a project, refactor across files, multi-part migration). Use "final" for a single-step answer.
DEFAULT for simple questions: use "final".
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
- ANY "Fix line" or "Explain line" request — always give a direct answer even if unsure

## SPECIAL RULES FOR CODE ANALYSIS ("Explain line" / "Fix line")
When you receive a request starting with "Explain line" or "Fix line":
1. **NEVER ask clarifying questions.** Always provide a direct, concrete answer.
2. **ALWAYS respond with "final" shape** — code analysis is never ambiguous enough for "clarify".
3. For "Explain line": Give a concise explanation of what that line does in context of the file.
4. For "Fix line": Explain the problem on that line, then propose the corrected line or minimal fix.
5. Output code fixes as plain text in the "answer" field — do not wrap in markdown.

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
1. Write code and explain it. The user copies it or saves it via Explorer/Editor.
2. Give terminal commands — write the exact command the user should run in the Terminal panel.
   Example: "Run this in the Terminal: npm install express"
3. Help navigate the workspace — tell the user which files to open in Explorer.
4. Explain errors pasted from the terminal or editor.
5. Generate file contents — the user creates the file manually in Explorer, then pastes the content.
6. Analyze lines of code in context and explain what they do.
7. Diagnose syntax errors, type errors, and logical issues on specific lines and suggest fixes.

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

When analyzing a line of code:
- First explain what the line does or what error exists.
- If it's an error, propose a fix concisely.
- Always provide output in the answer field, never ask for clarification.

## FORMAT OF ANSWERS
- Be direct and concrete. No filler phrases.
- For code: include it in "answer". Fenced code blocks are allowed and preferred:
  \`\`\`ts
  // code
  \`\`\`
- For terminal commands: prefix them clearly, e.g. "Run in Terminal:" or "Execute in Terminal:".
- Keep answers focused. Do not repeat the user's question back.

## WHEN USER ASKS TO CHANGE FILES
Prefer one of these two output styles inside "answer":
1) Unified diff:
--- a/path/to/file
+++ b/path/to/file
@@ ...
2) File marker + fenced block:
file: path/to/file
\`\`\`language
...full replacement content...
\`\`\`
Do not invent paths. Use only workspace-relative paths.
`

/** Shorter system prompt for small local models (7B–8B) to save context window. */
const SHORT_SYSTEM_PROMPT = `
You are Lexentia, a desktop IDE assistant.

LANGUAGE: Reply in the same language as the user's latest message (Russian ↔ Russian, English ↔ English).

OUTPUT — STRICT JSON only (no markdown fences):

{"type":"clarify","question":"...","options":["a","b"]} — ONLY if truly blocked. NEVER for code analysis.

{"type":"plan","title":"...","introduction":"...","steps":["s1","s2"]} — for multi-step work only.

{"type":"final","answer":"..."} — default for all tasks including code analysis.

KEY RULES:
- "Explain line" or "Fix line"? → Always "final" with direct answer. NEVER "clarify".
- Code analysis: Explain the line, or (if error) explain the issue and propose fix.
- Terminal commands: Give exact command, prefix "Run in Terminal:".
- Never invent non-existent UI buttons or actions.
- If returning code/file changes, prefer:
  - file: path/to/file + fenced block, or
  - unified diff (--- a/..., +++ b/...).
- Fenced code blocks are allowed in "answer".

REAL UI: Settings, Explorer, Chat, Editor, Terminal, Logs only.
Be concise. Code goes plain-text in "answer" field.
`.trim()

/** Ultra-compact system prompt for tiny models (1-3B parameters). */
const TINY_SYSTEM_PROMPT = `
You are a code assistant in a local IDE.

Reply in the **same language** as the user (Russian/English).

OUTPUT — JSON ONLY:
{"type":"final","answer":"your response"}

For code analysis: explain briefly or propose a fix.
For commands: write exact command.
Never ask for clarification on code—give best answer.
If changing files, prefer:
file: path/to/file
\`\`\`
code
\`\`\`
or unified diff format.
`.trim()

function safeJsonParse(input: string): any | null {
  const trimmed = input.trim()
  // Strip optional markdown code fences some models add despite instructions
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const target = stripped || trimmed
  const start = target.indexOf('{')
  const end = target.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  
  let candidate = target.slice(start, end + 1)
  
  try {
    return JSON.parse(candidate)
  } catch (e) {
    // Try to repair common issues with multiline strings
    try {
      // Some models return actual newlines instead of \n escape sequences
      // If JSON.parse fails, try replacing literal newlines with escaped ones
      candidate = candidate.replace(/([^\\])\n/g, '$1\\n')
      return JSON.parse(candidate)
    } catch {
      // Last resort: if answer field has unescaped newlines, fix it
      try {
        const answerMatch = candidate.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
        if (answerMatch) {
          const answerContent = answerMatch[1]
          const escaped = answerContent
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/"/g, '\\"')     // Escape quotes
            .replace(/\n/g, '\\n')    // Escape newlines
            .replace(/\r/g, '\\r')    // Escape carriage returns
            .replace(/\t/g, '\\t')    // Escape tabs
          const repaired = candidate.replace(answerMatch[0], `"answer":"${escaped}"`)
          return JSON.parse(repaired)
        }
      } catch {
        return null
      }
    }
    return null
  }
}

export class ModelService {
  /**
   * Optimize user message content for model size before sending to API
   */
  private optimizeMessageContent(content: string, modelName: string): string {
    const budget = getBudgetForModel(modelName)

    if (content.length <= budget.maxPromptChars) {
      return content
    }

    // Extract user query (usually first few words before code blocks)
    const queryMatch = content.match(/^([^\n]+)/)
    const userQuery = queryMatch ? queryMatch[1] : 'code analysis'

    const optimized = optimizeContextForModel(content, userQuery, budget)

    if (optimized.truncated) {
      console.log(
        `[contextOptimizer] Optimized prompt for ${budget.modelSize} model: ${estimateTokens(content)} → ${estimateTokens(optimized.optimized)} tokens`,
      )
    }

    return optimized.optimized
  }

  async next(
    messages: ChatMessage[],
    profile: ModelProfile,
    opts?: { temperature?: number; topP?: number; compactSystem?: boolean },
  ): Promise<ModelResult> {
    const temperature = opts?.temperature ?? 0.2
    const topP = opts?.topP ?? 0.9
    
    // Choose system prompt based on model size
    const modelSize = detectModelSize(profile.model)
    let systemText = SYSTEM_PROMPT.trim()
    
    if (opts?.compactSystem) {
      // Use compact prompts for smaller models
      systemText = modelSize === 'tiny' ? TINY_SYSTEM_PROMPT : SHORT_SYSTEM_PROMPT
    } else if (modelSize === 'tiny') {
      // Force tiny prompt for tiny models regardless of option
      systemText = TINY_SYSTEM_PROMPT
    } else if (modelSize === 'small') {
      // Use short prompt for small models
      systemText = SHORT_SYSTEM_PROMPT
    }

    // Optimize user message content for model size
    const optimizedMessages = messages.map((m) =>
      m.role === 'user'
        ? {
            ...m,
            content: this.optimizeMessageContent(m.content, profile.model),
          }
        : m,
    )

    let content = ''
    if (profile.provider === 'ollama') {
      const adapter = new OllamaAdapter(profile.model, profile.baseUrl)
      const ollamaMessages: OllamaChatMessage[] = [
        { role: 'system', content: systemText },
        ...optimizedMessages.map((m) => ({ role: m.role, content: m.content })),
      ]
      content = await adapter.chat(ollamaMessages, { temperature, top_p: topP })
    } else {
      const adapter = new OpenAICompatibleAdapter(profile.model, profile.baseUrl, profile.apiKey)
      const oaMessages: OpenAIChatMessage[] = [
        { role: 'system', content: systemText },
        ...optimizedMessages.map((m) => ({ role: m.role, content: m.content })),
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

    if (parsed?.type === 'plan') {
      const stepsRaw = parsed?.steps
      const steps = Array.isArray(stepsRaw) ? stepsRaw.map((x: any) => String(x).trim()).filter(Boolean) : []
      if (steps.length >= 2) {
        const title = String(parsed?.title ?? '').trim() || undefined
        const introduction = String(parsed?.introduction ?? parsed?.intro ?? '').trim() || undefined
        return { type: 'plan', title, introduction, steps: steps.slice(0, 12) }
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
    return { type: 'final', content: finalContent.trim() }
  }
}
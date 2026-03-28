import type { ModelAdapter } from './ModelAdapter'

export type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OpenAICompatibleOptions = {
  temperature?: number
  top_p?: number
  max_tokens?: number
  [k: string]: any
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  constructor(
    public readonly modelName: string,
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async generate(prompt: string, options?: any): Promise<string> {
    // For compatibility, implement generate via chat.
    return this.chat(
      [
        { role: 'user', content: prompt },
      ],
      options,
    )
  }

  private buildChatCompletionsUrl(): string {
    const raw = this.baseUrl.trim()
    const normalized = raw.replace(/\/+$/, '')

    if (normalized.endsWith('/chat/completions')) return normalized
    if (normalized.endsWith('/v1/chat/completions')) return normalized
    if (normalized.endsWith('/v1')) return `${normalized}/chat/completions`

    return `${normalized}/v1/chat/completions`
  }

  async chat(messages: OpenAIChatMessage[], options?: OpenAICompatibleOptions): Promise<string> {
    const url = this.buildChatCompletionsUrl()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.modelName,
        messages,
        stream: false,
        ...options,
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`OpenAI-compatible chat failed: ${res.status} ${res.statusText} ${txt}`.trim())
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return String(content ?? '')
  }
}


import type { ModelAdapter } from './ModelAdapter'

export type OllamaChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type OllamaChatOptions = {
  temperature?: number
  top_p?: number
  num_predict?: number
  [k: string]: any
}

export class OllamaAdapter implements ModelAdapter {
  constructor(
    public readonly modelName: string,
    private readonly baseUrl: string = 'http://127.0.0.1:11434',
  ) {}

  private buildUrl(path: string): string {
    const base = this.baseUrl.trim().replace(/\/+$/, '')
    const endpoint = path.startsWith('/') ? path : `/${path}`
    return `${base}${endpoint}`
  }

  async generate(prompt: string, options?: any): Promise<string> {
    const res = await fetch(this.buildUrl('/api/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        stream: false,
        options,
      }),
    })

    if (!res.ok) throw new Error(`Ollama /api/generate failed: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return String(data?.response ?? '')
  }

  async chat(messages: OllamaChatMessage[], options?: OllamaChatOptions): Promise<string> {
    const res = await fetch(this.buildUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        stream: false,
        options,
      }),
    })

    if (!res.ok) throw new Error(`Ollama /api/chat failed: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return String(data?.message?.content ?? '')
  }
}


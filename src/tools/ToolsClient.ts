export type ToolExtractResponse = {
  text: string
  filesProcessed: string[]
  warnings: string[]
}

export class ToolsClient {
  constructor(private readonly baseUrl: string = 'http://127.0.0.1:8000') {}

  private buildUrl(endpoint: string): string {
    const base = this.baseUrl.trim().replace(/\/+$/, '')
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${base}${path}`
  }

  private async extract(endpoint: string, file: File): Promise<ToolExtractResponse> {
    const form = new FormData()
    form.append('file', file, file.name)

    const res = await fetch(this.buildUrl(endpoint), {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Tools ${endpoint} failed: ${res.status} ${res.statusText} ${text}`.trim())
    }

    const data = (await res.json()) as ToolExtractResponse
    return data
  }

  async extractByExtension(file: File): Promise<ToolExtractResponse> {
    const name = file.name.toLowerCase()
    if (name.endsWith('.txt') || name.endsWith('.md')) return this.extract('/extract/txt', file)
    if (name.endsWith('.zip')) return this.extract('/extract/zip', file)
    if (name.endsWith('.pdf')) return this.extract('/extract/pdf', file)
    if (name.endsWith('.docx')) return this.extract('/extract/docx', file)
    // Fallback: try txt
    return this.extract('/extract/txt', file)
  }
}


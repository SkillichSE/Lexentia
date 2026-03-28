export interface ModelAdapter {
  generate(prompt: string, options?: any): Promise<string>
  // Optional: allow model-driven tool usage in future.
  useTool?: (tool: unknown, params?: any) => Promise<any>
  supportsFile?: boolean
}


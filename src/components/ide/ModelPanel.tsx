export function ModelPanel({
  profileLabel,
  profiles,
  activeProfileId,
  onActiveProfileIdChange,
  modelName,
  onModelNameChange,
  baseUrl,
  onBaseUrlChange,
  apiKey,
  onApiKeyChange,
  onConnect,
  showHeading = true,
}: {
  profileLabel: string
  profiles: { id: string; name: string }[]
  activeProfileId: string
  onActiveProfileIdChange: (id: string) => void
  modelName: string
  onModelNameChange: (v: string) => void
  baseUrl: string
  onBaseUrlChange: (v: string) => void
  apiKey?: string
  onApiKeyChange?: (v: string) => void
  onConnect: () => void
  showHeading?: boolean
}) {
  return (
    <div className="lex-modelPanel">
      {showHeading ? <div className="lex-sectionTitle">Model</div> : null}
      <div className="lex-field">
        <label className="lex-label">{profileLabel}</label>
        <select className="lex-input" value={activeProfileId} onChange={(e) => onActiveProfileIdChange(e.target.value)}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {onApiKeyChange ? (
        <div className="lex-field">
          <label className="lex-label">API key</label>
          <input
            className="lex-input"
            type="password"
            autoComplete="off"
            value={apiKey ?? ''}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-… or your provider’s secret"
          />
          <div className="lex-subtle" style={{ marginTop: 6 }}>
            Used for OpenAI-compatible endpoints (OpenAI, Anthropic proxies, Groq, etc.). Ollama profiles do not use this field.
          </div>
        </div>
      ) : null}
      <div className="lex-field lex-field--row">
        <button className="lex-btn lex-btn--primary" onClick={onConnect}>
          Connect
        </button>
      </div>
      <details className="lex-advancedDetails">
        <summary className="lex-advancedSummary">Advanced model settings</summary>
        <div className="lex-advancedDetailsBody">
          <div className="lex-field">
            <label className="lex-label">Model name</label>
            <input
              className="lex-input"
              value={modelName}
              onChange={(e) => onModelNameChange(e.target.value)}
              placeholder="e.g. llama3 / qwen2.5-coder / gpt-4o-mini"
            />
          </div>
          <div className="lex-field">
            <label className="lex-label">Base URL</label>
            <input className="lex-input" value={baseUrl} onChange={(e) => onBaseUrlChange(e.target.value)} />
          </div>
          <div className="lex-subtle">
            Base URL: Ollama uses <code className="lex-codeInline">http://127.0.0.1:11434</code>; OpenAI Cloud uses{' '}
            <code className="lex-codeInline">https://api.openai.com/v1</code>; LM Studio usually{' '}
            <code className="lex-codeInline">http://127.0.0.1:1234/v1</code>.
          </div>
        </div>
      </details>
    </div>
  )
}


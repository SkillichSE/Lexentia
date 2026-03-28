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
}) {
  return (
    <div className="lex-modelPanel">
      <div className="lex-sectionTitle">Model</div>
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
      {onApiKeyChange ? (
        <div className="lex-field">
          <label className="lex-label">API key (optional)</label>
          <input className="lex-input" value={apiKey ?? ''} onChange={(e) => onApiKeyChange(e.target.value)} />
        </div>
      ) : null}
      <div className="lex-field lex-field--row">
        <button className="lex-btn lex-btn--primary" onClick={onConnect}>
          Connect
        </button>
      </div>
      <div className="lex-subtle">
        You can use Ollama or an OpenAI-compatible endpoint (for example LM Studio at `http://localhost:1234/v1`).
      </div>
    </div>
  )
}


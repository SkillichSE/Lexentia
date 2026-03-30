import type { ModelProfile, ModelProfilesState } from '../../services/modelProfiles'
import type { PromptBudgetMode } from '../../services/promptBudget'
import { ModelPanel } from './ModelPanel'

export function SettingsView({
  profilesState,
  activeProfile,
  onActiveProfileIdChange,
  onModelNameChange,
  onBaseUrlChange,
  onApiKeyChange,
  onConnectModel,
  toolsBaseUrl,
  onToolsBaseUrlChange,
  temperature,
  onTemperatureChange,
  topP,
  onTopPChange,
  onExportHistory,
  onClearHistory,
  promptBudgetMode,
  onPromptBudgetModeChange,
}: {
  profilesState: ModelProfilesState
  activeProfile: ModelProfile
  onActiveProfileIdChange: (id: string) => void
  onModelNameChange: (value: string) => void
  onBaseUrlChange: (value: string) => void
  onApiKeyChange?: (value: string) => void
  onConnectModel: () => void
  toolsBaseUrl: string
  onToolsBaseUrlChange: (value: string) => void
  temperature: number
  onTemperatureChange: (value: number) => void
  topP: number
  onTopPChange: (value: number) => void
  onExportHistory: () => void
  onClearHistory: () => void
  promptBudgetMode: PromptBudgetMode
  onPromptBudgetModeChange: (mode: PromptBudgetMode) => void
}) {
  return (
    <div className="lex-settingsView">
      <ModelPanel
        showHeading={false}
        profileLabel="Profile"
        profiles={profilesState.profiles.map((p) => ({ id: p.id, name: p.name }))}
        activeProfileId={profilesState.activeProfileId}
        onActiveProfileIdChange={onActiveProfileIdChange}
        modelName={activeProfile.model}
        onModelNameChange={onModelNameChange}
        baseUrl={activeProfile.baseUrl}
        onBaseUrlChange={onBaseUrlChange}
        apiKey={activeProfile.apiKey}
        onApiKeyChange={onApiKeyChange}
        onConnect={onConnectModel}
      />

      <details className="lex-advancedDetails">
        <summary className="lex-advancedSummary">Advanced (one-time setup)</summary>
        <div className="lex-advancedDetailsBody">
          <div className="lex-sectionTitle">Runtime</div>
          <div className="lex-field">
            <label className="lex-label">Tools base URL</label>
            <input className="lex-input" value={toolsBaseUrl} onChange={(e) => onToolsBaseUrlChange(e.target.value)} />
          </div>
          <div className="lex-field">
            <label className="lex-label">Temperature</label>
            <input
              className="lex-input"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
            />
          </div>
          <div className="lex-field">
            <label className="lex-label">Top P</label>
            <input
              className="lex-input"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={topP}
              onChange={(e) => onTopPChange(Number(e.target.value))}
            />
          </div>
          <div className="lex-field">
            <label className="lex-label">Prompt budget</label>
            <select
              className="lex-input"
              value={promptBudgetMode}
              onChange={(e) => onPromptBudgetModeChange(e.target.value as PromptBudgetMode)}
            >
              <option value="auto">Auto (by model name, e.g. 8B → small)</option>
              <option value="small">Small (7–8B and weaker)</option>
              <option value="balanced">Balanced</option>
              <option value="large">Large context</option>
            </select>
            <p className="lex-subtle">
              Shortens system prompt and limits attachments, @codebase, extracted files, and \"Explain line\" so small models don't choke.
            </p>
          </div>

          <div className="lex-sectionTitle">History</div>
          <div className="lex-field lex-field--row">
            <button className="lex-btn lex-btn--primary" onClick={onExportHistory}>
              Export
            </button>
            <button className="lex-btn" onClick={onClearHistory}>
              Clear
            </button>
          </div>
        </div>
      </details>
    </div>
  )
}

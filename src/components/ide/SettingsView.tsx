import { useMemo, useState } from 'react'
import type { ModelProfile, ModelProfilesState } from '../../services/modelProfiles'
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
  onResetOnboarding,
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
  onResetOnboarding: () => void
}) {
  const tabs = useMemo(() => ['Model', 'Runtime', 'One-time'] as const, [])
  const [tab, setTab] = useState<(typeof tabs)[number]>('Model')

  return (
    <div className="lex-settingsView">
      <div className="lex-modeSwitch lex-modeSwitch--three" style={{ marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? 'lex-modeBtn lex-modeBtn--active' : 'lex-modeBtn'}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Model' ? (
        <ModelPanel
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
      ) : null}

      {tab === 'Runtime' ? (
        <>
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
        </>
      ) : null}

      {tab === 'One-time' ? (
        <>
          <div className="lex-sectionTitle">One-time / Maintenance</div>
          <div className="lex-field lex-field--row">
            <button className="lex-btn lex-btn--primary" onClick={onExportHistory}>
              Export history
            </button>
            <button className="lex-btn" onClick={onClearHistory}>
              Clear history
            </button>
          </div>
          <div className="lex-field lex-field--row">
            <button className="lex-btn" onClick={onResetOnboarding}>
              Reset onboarding
            </button>
          </div>
          <div className="lex-subtle" style={{ marginTop: 8 }}>
            One-time actions outside the current workspace.
          </div>
        </>
      ) : null}
    </div>
  )
}

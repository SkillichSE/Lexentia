export function OnboardingOverlay({
  open,
  hasConnectedModel,
  hasWorkspace,
  hasSentMessage,
  onGoSettings,
  onGoExplorer,
  onGoChat,
  onComplete,
}: {
  open: boolean
  hasConnectedModel: boolean
  hasWorkspace: boolean
  hasSentMessage: boolean
  onGoSettings: () => void
  onGoExplorer: () => void
  onGoChat: () => void
  onComplete: () => void
}) {
  if (!open) return null

  const allDone = hasConnectedModel && hasWorkspace && hasSentMessage

  return (
    <div className="lex-onboardingOverlay" role="dialog" aria-label="Onboarding">
      <div className="lex-onboardingCard">
        <div className="lex-sectionTitle">Welcome to Lexentia</div>
        <div className="lex-subtle" style={{ marginBottom: 16 }}>
          Three steps to get started:
        </div>

        <div className="lex-onboardingSteps">
          <button className="lex-onboardingStep" onClick={onGoSettings}>
            <span className="lex-onboardingStepNum">{hasConnectedModel ? '✓' : '1'}</span>
            <div>
              <div>Connect a model</div>
              <div className="lex-subtle">Settings → choose profile → Connect</div>
            </div>
          </button>
          <button className="lex-onboardingStep" onClick={onGoExplorer}>
            <span className="lex-onboardingStepNum">{hasWorkspace ? '✓' : '2'}</span>
            <div>
              <div>Open a project folder</div>
              <div className="lex-subtle">Explorer → Open Folder</div>
            </div>
          </button>
          <button className="lex-onboardingStep" onClick={onGoChat}>
            <span className="lex-onboardingStepNum">{hasSentMessage ? '✓' : '3'}</span>
            <div>
              <div>Send your first request</div>
              <div className="lex-subtle">Chat → describe your task</div>
            </div>
          </button>
        </div>

        <div className="lex-subtle" style={{ marginTop: 12, marginBottom: 8, fontSize: 11 }}>
          Tip: terminal is already running — give the model commands to execute and copy them there.
        </div>

        <div className="lex-field lex-field--row">
          <button className="lex-btn" onClick={onComplete}>
            Skip
          </button>
          <button className="lex-btn lex-btn--primary" onClick={onComplete} disabled={!allDone}>
            {allDone ? 'Get Started' : `Steps left: ${[hasConnectedModel, hasWorkspace, hasSentMessage].filter(Boolean).length}/3 ✓`}
          </button>
        </div>
      </div>
    </div>
  )
}

import type { ChatPlanBlock } from './chatPlanTypes'

export function PlanCard({
  plan,
  onAllow,
  onReject,
  disabled,
}: {
  plan: ChatPlanBlock
  onAllow: () => void
  onReject: () => void
  disabled?: boolean
}) {
  const pending = plan.approval === 'pending'
  const rejected = plan.approval === 'rejected'

  return (
    <div className={`lex-planCard ${plan.executing ? 'lex-planCard--executing' : ''} ${rejected ? 'lex-planCard--rejected' : ''}`}>
      {plan.title ? <div className="lex-planCardTitle">{plan.title}</div> : null}
      {plan.introduction ? <div className="lex-planCardIntro">{plan.introduction}</div> : null}
      <ol className="lex-planSteps">
        {plan.steps.map((s) => (
          <li key={s.id} className={s.done ? 'lex-planStep lex-planStep--done' : 'lex-planStep'}>
            <span className="lex-planStepText">{s.text}</span>
          </li>
        ))}
      </ol>
      {pending ? (
        <div className="lex-planActions">
          <button type="button" className="lex-btn lex-btn--primary lex-btn--small" disabled={disabled} onClick={onAllow}>
            Allow
          </button>
          <button type="button" className="lex-btn lex-btn--small" disabled={disabled} onClick={onReject}>
            Reject
          </button>
        </div>
      ) : null}
      {rejected ? <div className="lex-planRejected">Plan rejected.</div> : null}
      {plan.executing && plan.approval === 'accepted' ? <div className="lex-planExecuting">Executing plan…</div> : null}
    </div>
  )
}

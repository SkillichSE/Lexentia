// plancard with step interaction controls per spec section 3.3
import type { ChatPlanBlock, StepStatus, PlanStepAction } from './chatPlanTypes'
import { useState } from 'react'

interface PlanCardProps {
  plan: ChatPlanBlock
  onAllow: () => void
  onReject: () => void
  onStepAction?: (stepId: string, action: PlanStepAction) => void
  disabled?: boolean
}

const statusIcon: Record<StepStatus, string> = {
  pending: '○',
  running: '◐',
  done: '✓',
  skipped: '⊘',
}

const statusClass: Record<StepStatus, string> = {
  pending: 'lex-planStep--pending',
  running: 'lex-planStep--running',
  done: 'lex-planStep--done',
  skipped: 'lex-planStep--skipped',
}

export function PlanCard({
  plan,
  onAllow,
  onReject,
  onStepAction,
  disabled,
}: PlanCardProps) {
  const pending = plan.approval === 'pending'
  const rejected = plan.approval === 'rejected'
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  const handleStepAction = (stepId: string, action: PlanStepAction) => {
    onStepAction?.(stepId, action)
  }

  return (
    <div className={`lex-planCard ${plan.executing ? 'lex-planCard--executing' : ''} ${rejected ? 'lex-planCard--rejected' : ''}`}>
      {plan.title ? <div className="lex-planCardTitle">{plan.title}</div> : null}
      {plan.introduction ? <div className="lex-planCardIntro">{plan.introduction}</div> : null}
      <ol className="lex-planSteps">
        {plan.steps.map((s) => (
          <li
            key={s.id}
            className={`lex-planStep ${statusClass[s.status]}`}
            onMouseEnter={() => setHoveredStep(s.id)}
            onMouseLeave={() => setHoveredStep(null)}
          >
            <span className="lex-planStepIcon">{statusIcon[s.status]}</span>
            <span className="lex-planStepText">{s.text}</span>
            {s.description ? <div className="lex-planStepDesc">{s.description}</div> : null}

            {/* hover controls per spec section 3.3 */}
            {hoveredStep === s.id && s.status === 'pending' && onStepAction && (
              <div className="lex-planStepControls">
                <button
                  type="button"
                  className="lex-planStepBtn lex-planStepBtn--run"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStepAction(s.id, 'run')
                  }}
                  disabled={disabled}
                >
                  run
                </button>
                <button
                  type="button"
                  className="lex-planStepBtn lex-planStepBtn--edit"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStepAction(s.id, 'edit')
                  }}
                  disabled={disabled}
                >
                  edit
                </button>
                <button
                  type="button"
                  className="lex-planStepBtn lex-planStepBtn--skip"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStepAction(s.id, 'skip')
                  }}
                  disabled={disabled}
                >
                  skip
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {pending ? (
        <div className="lex-planActions">
          <button type="button" className="lex-btn lex-btn--primary lex-btn--small" disabled={disabled} onClick={onAllow}>
            allow
          </button>
          <button type="button" className="lex-btn lex-btn--small" disabled={disabled} onClick={onReject}>
            reject
          </button>
        </div>
      ) : null}
      {rejected ? <div className="lex-planRejected">plan rejected.</div> : null}
      {plan.executing && plan.approval === 'accepted' ? <div className="lex-planExecuting">executing plan...</div> : null}
    </div>
  )
}

// updated chat plan types with step status and controls per spec section 3.3
export type StepStatus = 'pending' | 'running' | 'done' | 'skipped'

export type ChatPlanStep = {
  id: string
  text: string
  description?: string
  status: StepStatus
}

export type ChatPlanBlock = {
  title?: string
  introduction?: string
  steps: ChatPlanStep[]
  approval: 'pending' | 'accepted' | 'rejected'
  executing?: boolean
}

export type PlanStepAction = 'run' | 'edit' | 'skip'

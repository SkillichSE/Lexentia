export type ChatPlanStep = { id: string; text: string; done: boolean }

export type ChatPlanBlock = {
  title?: string
  introduction?: string
  steps: ChatPlanStep[]
  approval: 'pending' | 'accepted' | 'rejected'
  executing?: boolean
}

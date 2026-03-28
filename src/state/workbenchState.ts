export type ActivityView = 'explorer' | 'chat' | 'history' | 'settings'
export type MainView = 'chat' | 'editor' | 'settings'
export type BottomTab = 'terminal' | 'logs'

export type WorkbenchState = {
  version: 1
  activityView: ActivityView
  mainView: MainView
  bottomVisible: boolean
  bottomTab: BottomTab
  secondaryVisible: boolean
}

const KEY = 'lex.workbench.v1'

const DEFAULTS: WorkbenchState = {
  version: 1,
  activityView: 'explorer',
  mainView: 'chat',
  bottomVisible: true,
  bottomTab: 'terminal',
  secondaryVisible: true,
}

export function loadWorkbenchState(): WorkbenchState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<WorkbenchState>
    if (parsed.version !== 1) return DEFAULTS
    return {
      version: 1,
      activityView: parsed.activityView ?? DEFAULTS.activityView,
      mainView: parsed.mainView ?? DEFAULTS.mainView,
      bottomVisible: Boolean(parsed.bottomVisible),
      bottomTab: parsed.bottomTab ?? DEFAULTS.bottomTab,
      secondaryVisible: Boolean(parsed.secondaryVisible),
    }
  } catch {
    return DEFAULTS
  }
}

export function saveWorkbenchState(state: WorkbenchState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

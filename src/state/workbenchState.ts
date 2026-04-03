export type ActivityView =
  | 'explorer'
  | 'search'
  | 'git'
  | 'debug'
  | 'extensions'
  | 'accounts'
  | 'settings'

export type MainView = 'chat' | 'editor'
export type BottomTab = 'terminal' | 'logs'

export type WorkbenchState = {
  version: 2
  activityView: ActivityView
  mainView: MainView
  bottomVisible: boolean
  bottomTab: BottomTab
  secondaryVisible: boolean
  editorSplit: boolean
  secondaryRelPath: string | null
}

const KEY = 'lex.workbench.v1'

const DEFAULTS: WorkbenchState = {
  version: 2,
  activityView: 'explorer',
  mainView: 'editor',
  bottomVisible: false,
  bottomTab: 'logs',
  secondaryVisible: false,
  editorSplit: false,
  secondaryRelPath: null,
}

const LEGACY_ACTIVITY: Record<string, ActivityView> = {
  chat: 'search',
  history: 'extensions',
}

function normalizeActivityView(raw: unknown): ActivityView {
  if (typeof raw !== 'string') return DEFAULTS.activityView
  if (raw in LEGACY_ACTIVITY) return LEGACY_ACTIVITY[raw]!
  const allowed: ActivityView[] = [
    'explorer',
    'search',
    'git',
    'debug',
    'extensions',
    'accounts',
    'settings',
  ]
  return allowed.includes(raw as ActivityView) ? (raw as ActivityView) : DEFAULTS.activityView
}

export function loadWorkbenchState(): WorkbenchState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<WorkbenchState> & { version?: number }
    const version = Number(parsed.version ?? 0)
    if (version < 1 || version > 2) return DEFAULTS
    return {
      version: 2,
      activityView: normalizeActivityView(parsed.activityView),
      mainView: parsed.mainView === 'editor' ? 'editor' : 'chat',
      bottomVisible: false,
      bottomTab: 'logs',
      secondaryVisible: Boolean(parsed.secondaryVisible),
      editorSplit: Boolean(parsed.editorSplit),
      secondaryRelPath: typeof parsed.secondaryRelPath === 'string' ? parsed.secondaryRelPath : null,
    }
  } catch {
    return DEFAULTS
  }
}

export function saveWorkbenchState(state: WorkbenchState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

import type { ActivityView } from '../../state/workbenchState'

type BarItem = { id: ActivityView; label: string; section: 'top' | 'bottom'; icon: 'explorer' | 'search' | 'github' | 'debug' | 'extensions' | 'accounts' | 'settings' }

const ITEMS: BarItem[] = [
  { id: 'explorer', label: 'Explorer', section: 'top', icon: 'explorer' },
  { id: 'search', label: 'Search', section: 'top', icon: 'search' },
  { id: 'git', label: 'Git', section: 'top', icon: 'github' },
  { id: 'debug', label: 'Run and debug', section: 'top', icon: 'debug' },
  { id: 'accounts', label: 'Accounts', section: 'bottom', icon: 'accounts' },
  { id: 'settings', label: 'Settings', section: 'bottom', icon: 'settings' },
]

function Icon({ name }: { name: BarItem['icon'] }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const }
  switch (name) {
    case 'explorer':
      return (
        <svg {...common}>
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      )
    case 'github':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      )
    case 'debug':
      return (
        <svg {...common}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'extensions':
      return (
        <svg {...common}>
          <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
        </svg>
      )
    case 'accounts':
      return (
        <svg {...common}>
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      )
    default:
      return null
  }
}

export function ActivityBar({
  active,
  onSelect,
}: {
  active: ActivityView
  onSelect: (id: ActivityView) => void
}) {
  const top = ITEMS.filter((i) => i.section === 'top')
  const bottom = ITEMS.filter((i) => i.section === 'bottom')
  return (
    <aside className="lex-activityBar" aria-label="Activity">
      <div className="lex-activityBarTop">
        {top.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'lex-activityBtn lex-activityBtn--active' : 'lex-activityBtn'}
            onClick={() => onSelect(item.id)}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} />
          </button>
        ))}
      </div>
      <div className="lex-activityBarSpacer" aria-hidden />
      <div className="lex-activityBarBottom">
        {bottom.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'lex-activityBtn lex-activityBtn--active' : 'lex-activityBtn'}
            onClick={() => onSelect(item.id)}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} />
          </button>
        ))}
      </div>
    </aside>
  )
}

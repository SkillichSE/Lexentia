import type { ActivityView } from '../../state/workbenchState'

const ITEMS: { id: ActivityView; label: string; glyph: string }[] = [
  { id: 'explorer', label: 'Explorer', glyph: 'E' },
  { id: 'chat', label: 'Chat', glyph: 'C' },
  { id: 'history', label: 'History', glyph: 'H' },
  { id: 'settings', label: 'Settings', glyph: 'S' },
]

export function ActivityBar({
  active,
  onSelect,
}: {
  active: ActivityView
  onSelect: (id: ActivityView) => void
}) {
  return (
    <aside className="lex-activityBar" aria-label="Activity Bar">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? 'lex-activityBtn lex-activityBtn--active' : 'lex-activityBtn'}
          onClick={() => onSelect(item.id)}
          title={item.label}
          aria-label={item.label}
        >
          {item.glyph}
        </button>
      ))}
    </aside>
  )
}

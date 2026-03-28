import { useEffect, useMemo, useState } from 'react'

type MenuId = 'file' | 'edit' | 'view' | 'help' | null

export function MenuBar({
  onOpenFolder,
  onSave,
  onReload,
}: {
  onOpenFolder: () => void
  onSave: () => void
  onReload: () => void
}) {
  const [open, setOpen] = useState<MenuId>(null)

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (isSave) {
        e.preventDefault()
        onSave()
      }
      const isReload = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r'
      if (isReload) {
        e.preventDefault()
        onReload()
      }
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [onReload, onSave])

  const items = useMemo(
    () => ({
      file: [
        { label: 'Open Folder…', hint: 'Ctrl+O', onClick: onOpenFolder },
        { label: 'Save', hint: 'Ctrl+S', onClick: onSave },
        { label: 'Reload', hint: 'Ctrl+R', onClick: onReload },
      ],
      edit: [{ label: 'Copy', hint: 'Ctrl+C', onClick: () => document.execCommand('copy') }],
      view: [{ label: 'Reload', hint: 'Ctrl+R', onClick: onReload }],
      help: [{ label: 'About', hint: '', onClick: () => alert('Lexentia (MVP)') }],
    }),
    [onOpenFolder, onReload, onSave],
  )

  return (
    <div className="lex-menubar" onMouseLeave={() => setOpen(null)}>
      <MenuButton id="file" label="File" open={open} setOpen={setOpen} />
      <MenuButton id="edit" label="Edit" open={open} setOpen={setOpen} />
      <MenuButton id="view" label="View" open={open} setOpen={setOpen} />
      <MenuButton id="help" label="Help" open={open} setOpen={setOpen} />

      {open ? (
        <div className="lex-menu" role="menu">
          {items[open].map((it) => (
            <button
              key={it.label}
              className="lex-menuItem"
              onClick={() => {
                setOpen(null)
                it.onClick()
              }}
            >
              <span>{it.label}</span>
              <span className="lex-menuHint">{it.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MenuButton({
  id,
  label,
  open,
  setOpen,
}: {
  id: Exclude<MenuId, null>
  label: string
  open: MenuId
  setOpen: (v: MenuId) => void
}) {
  return (
    <button
      className={open === id ? 'lex-menubtn lex-menubtn--active' : 'lex-menubtn'}
      onClick={() => setOpen(open === id ? null : id)}
      type="button"
    >
      {label}
    </button>
  )
}


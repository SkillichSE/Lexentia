import { useEffect, useMemo, useRef, useState } from 'react'

type MenuId = 'file' | 'edit' | 'view' | 'help' | null

export function MenuBar({
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSave,
  onReload,
  onCommandPalette,
}: {
  onNewFile: () => void | Promise<void>
  onOpenFile: () => void | Promise<void>
  onOpenFolder: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onReload: () => void | Promise<void>
  onCommandPalette: () => void
}) {
  const [open, setOpen] = useState<MenuId>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.code === 'KeyS') {
        e.preventDefault()
        void onSave()
      }
      if (mod && e.code === 'KeyR') {
        e.preventDefault()
        void onReload()
      }
      if (e.code === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [onReload, onSave])

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (rootRef.current && !rootRef.current.contains(target)) setOpen(null)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('touchstart', onDocDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('touchstart', onDocDown)
    }
  }, [open])

  const items = useMemo(
    () => ({
      file: [
        { label: 'New File…', hint: 'Ctrl+N', onClick: onNewFile },
        { label: 'Open File…', hint: 'Ctrl+P', onClick: onOpenFile },
        { label: 'Open Folder…', hint: 'Ctrl+O', onClick: onOpenFolder },
        { label: 'Save', hint: 'Ctrl+S', onClick: onSave },
        { label: 'Reload', hint: 'Ctrl+R', onClick: onReload },
      ],
      edit: [{ label: 'Copy', hint: 'Ctrl+C', onClick: () => document.execCommand('copy') }],
      view: [
        { label: 'Command Palette', hint: 'Ctrl+Shift+P', onClick: onCommandPalette },
        { label: 'Reload', hint: 'Ctrl+R', onClick: onReload },
      ],
      help: [{ label: 'About', hint: '', onClick: () => window.alert('Lexentia (MVP)') }],
    }),
    [onCommandPalette, onNewFile, onOpenFile, onOpenFolder, onReload, onSave],
  )

  return (
    <div className="lex-menubar" ref={rootRef}>
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


import { useEffect, useMemo, useRef, useState } from 'react'

export type MenuAction =
  | 'file.openFolder'
  | 'file.save'
  | 'file.reload'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.find'
  | 'selection.selectAll'
  | 'view.toggleExplorer'
  | 'view.toggleSearch'
  | 'view.togglePanel'
  | 'go.line'
  | 'run.debug'
  | 'terminal.new'
  | 'help.about'

type MenuId =
  | 'file'
  | 'edit'
  | 'selection'
  | 'view'
  | 'go'
  | 'run'
  | 'terminal'
  | 'help'
  | null

type Item = { action?: MenuAction; label: string; hint?: string; disabled?: boolean }

export function MenuBar({
  onAction,
}: {
  onAction: (action: MenuAction) => void
}) {
  const [open, setOpen] = useState<MenuId>(null)
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
  const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down')
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const menuBarRef = useRef<HTMLDivElement | null>(null)

  const updateMenuPosition = (menuId: MenuId) => {
    if (!menuId) return
    const button = buttonRefs.current[menuId]
    if (!button) return
    const rect = button.getBoundingClientRect()
    setMenuAnchorRect(rect)

    const bottomSpace = window.innerHeight - rect.bottom
    const topSpace = rect.top
    if (bottomSpace < 220 && topSpace > bottomSpace) {
      setMenuDirection('up')
    } else {
      setMenuDirection('down')
    }
  }

  const toggleMenu = (menuId: MenuId) => {
    const next = open === menuId ? null : menuId
    setOpen(next)
    if (next) {
      updateMenuPosition(next)
    } else {
      setMenuAnchorRect(null)
    }
  }

  useEffect(() => {
    if (!open) return
    const onResize = () => updateMenuPosition(open)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!menuBarRef.current?.contains(target)) {
        setOpen(null)
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (isSave) {
        e.preventDefault()
        onAction('file.save')
      }
      const isReload = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r'
      if (isReload) {
        e.preventDefault()
        onAction('file.reload')
      }
      const isTerminal = (e.ctrlKey || e.metaKey) && e.key === '`'
      if (isTerminal) {
        e.preventDefault()
        onAction('terminal.new')
      }
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [onAction])

  const menus = useMemo(
    () =>
      ({
        file: {
          title: 'File',
          desc: 'Manage files and folders: create files, open projects, save, auto-save.',
          items: [
            { label: 'Open Folder…', hint: 'Ctrl+O', action: 'file.openFolder' as const },
            { label: 'Save', hint: 'Ctrl+S', action: 'file.save' as const },
            { label: 'Reload window', hint: 'Ctrl+R', action: 'file.reload' as const },
          ],
        },
        edit: {
          title: 'Edit',
          desc: 'Undo/redo, copy, paste, find and replace in file.',
          items: [
            { label: 'Copy', hint: 'Ctrl+C', action: 'edit.copy' as const },
            { label: 'Paste', hint: 'Ctrl+V', action: 'edit.paste' as const },
            { label: 'Find in file…', hint: 'Ctrl+F', action: 'edit.find' as const },
          ],
        },
        selection: {
          title: 'Selection',
          desc: 'Select all, extend selection, multi-cursor (in development).',
          items: [{ label: 'Select All', hint: 'Ctrl+A', action: 'selection.selectAll' as const }],
        },
        view: {
          title: 'View',
          desc: 'Toggle side panels, zoom, zen mode.',
          items: [
            { label: 'Explorer', action: 'view.toggleExplorer' as const },
            { label: 'Chat context / Search', action: 'view.toggleSearch' as const },
            { label: 'Toggle bottom panel', action: 'view.togglePanel' as const },
          ],
        },
        go: {
          title: 'Go',
          desc: 'Go to line, recent files (partially).',
          items: [{ label: 'Go to Line…', hint: 'Ctrl+G', action: 'go.line' as const }],
        },
        run: {
          title: 'Run',
          desc: 'Run and debug — configurations coming later.',
          items: [{ label: 'Start debugging', disabled: true }],
        },
        terminal: {
          title: 'Terminal',
          desc: 'Manage terminal sessions, execute commands.',
          items: [
            { label: 'New Terminal', hint: 'Ctrl+`', action: 'terminal.new' as const },
            { label: 'Kill Terminal', disabled: true },
            { label: 'Clear Terminal', disabled: true },
          ],
        },
        help: {
          title: 'Help',
          desc: 'Updates, documentation, community.',
          items: [{ label: 'About Lexentia', action: 'help.about' as const }],
        },
      }) as const,
    [],
  )

  return (
    <div className="lex-menubar" ref={menuBarRef}>
      {(Object.keys(menus) as (keyof typeof menus)[]).map((id) => (
        <div key={id} className="lex-menuSlot">
          <button
            ref={(el) => {
              buttonRefs.current[id] = el
            }}
            type="button"
            className={open === id ? 'lex-menubtn lex-menubtn--active' : 'lex-menubtn'}
            onClick={() => toggleMenu(id)}
          >
            {menus[id].title}
          </button>
          {open === id ? (
            <div
              className="lex-menu lex-menu--wide"
              role="menu"
              style={
                menuAnchorRect
                  ? {
                      position: 'fixed',
                      left: Math.max(8, menuAnchorRect.left),
                      width: Math.max(220, menuAnchorRect.width),
                      maxWidth: 'min(360px, 90vw)',
                      top: menuDirection === 'down' ? Math.min(window.innerHeight - 32, menuAnchorRect.bottom + 4) : undefined,
                      bottom:
                        menuDirection === 'up' ? Math.max(8, window.innerHeight - menuAnchorRect.top + 4) : undefined,
                    }
                  : undefined
              }
            >
                {menus[id].items.map((it: Item) => (
                <button
                  key={it.label}
                  type="button"
                  className="lex-menuItem"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    if (it.disabled || !it.action) return
                    setOpen(null)
                    onAction(it.action)
                  }}
                >
                  <span>{it.label}</span>
                  {it.hint ? <span className="lex-menuHint">{it.hint}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

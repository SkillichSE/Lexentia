import { useCallback, useEffect, useRef, useState } from 'react'
import { TreeFileIcon } from './TreeFileIcon'

type DirEntry = { name: string; isDir: boolean; size: number; mtimeMs: number }

type TreeNode = {
  id: string
  name: string
  relPath: string
  isDir: boolean
  expanded?: boolean
  loading?: boolean
  error?: string
  children?: TreeNode[]
}

function joinRel(base: string, name: string) {
  if (!base || base === '.') return name
  return `${base}/${name}`
}

function toNode(entry: DirEntry, parentRel: string): TreeNode {
  const relPath = joinRel(parentRel, entry.name)
  return { id: relPath, name: entry.name, relPath, isDir: entry.isDir }
}

function patchNode(root: TreeNode, relPath: string, fn: (n: TreeNode) => TreeNode): TreeNode {
  if (root.relPath === relPath) return fn(root)
  if (!root.children) return root
  return {
    ...root,
    children: root.children.map((c) => patchNode(c, relPath, fn)),
  }
}

async function loadDir(relPath: string): Promise<{ entries: DirEntry[]; error?: string }> {
  try {
    const res = await window.lexentia.fs.listDir(relPath)
    if (!res.ok) return { entries: [], error: res.error ?? 'Failed to load directory' }
    return { entries: res.entries ?? [] }
  } catch (e: any) {
    return { entries: [], error: e?.message ?? String(e) }
  }
}





function sortEntries(entries: DirEntry[]): DirEntry[] {
  return entries.sort((a, b) => {
    // Directories first
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    // Then alphabetically (case-insensitive)
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

export function FileExplorerPanel({
  onOpenFile,
  onOpenFileInNewTab,
  onWorkspaceChanged,
  activeRelPath,
  controlledWorkspaceRoot,
  onAttachToChat,
}: {
  onOpenFile: (relPath: string) => void
  onOpenFileInNewTab?: (relPath: string) => void
  onWorkspaceChanged?: (workspaceRoot: string | null) => void
  activeRelPath?: string | null
  /** When set from parent (e.g. File menu), sync explorer tree. */
  controlledWorkspaceRoot?: string | null
  /** Called when user right-clicks a file and selects attach */
  onAttachToChat?: (relPath: string) => void
}) {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [root, setRoot] = useState<TreeNode | null>(null)
  const [selectedRelPath, setSelectedRelPath] = useState<string | null>(null)
  const [newFolderPrompt, setNewFolderPrompt] = useState(false)
  const [watchedDirs, setWatchedDirs] = useState<Set<string>>(new Set())
  const watchedDirsRef = useRef<Set<string>>(new Set())

  const replaceWatchedDirs = (next: Set<string>) => {
    watchedDirsRef.current = next
    setWatchedDirs(next)
  }

  useEffect(() => {
    if (activeRelPath) setSelectedRelPath(activeRelPath)
  }, [activeRelPath])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isNewFolder = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N')
      if (isNewFolder) {
        e.preventDefault()
        setNewFolderPrompt(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // FIX: use useCallback so the reference is stable and doesn't re-trigger effects
  const onWorkspaceChangedStable = useCallback(
    (ws: string | null) => onWorkspaceChanged?.(ws),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Restore persisted workspace on mount
  useEffect(() => {
    ;(async () => {
      const res = await window.lexentia.workspace.get()
      const ws = res.workspaceRoot ?? null
      setWorkspaceRoot(ws)
      onWorkspaceChangedStable(ws)
      if (ws) {
        initRootNode(ws)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!controlledWorkspaceRoot) return
    if (controlledWorkspaceRoot === workspaceRoot) return
    setWorkspaceRoot(controlledWorkspaceRoot)
    initRootNode(controlledWorkspaceRoot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledWorkspaceRoot])

  const initRootNode = (ws: string) => {
    setRoot({
      id: '.',
      name: ws.split(/[/\\]/).pop() || ws,
      relPath: '.',
      isDir: true,
      expanded: true,
      loading: true,
    })
    // FIX: load root dir contents directly, not via a separate effect,
    // to avoid the infinite re-render loop caused by depending on `root`.
    loadDir('.').then(({ entries, error }) => {
      setRoot((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              error,
              children: sortEntries(entries).map((e) => toNode(e, '.')),
            }
          : prev,
      )
    })
    for (const rel of watchedDirsRef.current) {
      void window.lexentia.fs.unwatchDir(rel)
    }
    void window.lexentia.fs.watchDir('.')
    replaceWatchedDirs(new Set(['.']))
  }

  const refreshDirNode = async (relPath: string) => {
    const { entries, error } = await loadDir(relPath)
    setRoot((prev) =>
      prev
        ? patchNode(prev, relPath, (n) => ({
            ...n,
            loading: false,
            error,
            children: sortEntries(entries).map((e) => toNode(e, relPath)),
          }))
        : prev,
    )
  }

  const openFolder = async () => {
    const res = await window.lexentia.workspace.openFolder()
    if (!res.ok || !res.workspaceRoot) return
    const ws = res.workspaceRoot
    setWorkspaceRoot(ws)
    onWorkspaceChangedStable(ws)
    initRootNode(ws)
  }

  const refreshRoot = () => {
    if (!workspaceRoot) return
    setRoot((prev) => (prev ? { ...prev, loading: true, error: undefined, children: undefined } : prev))
    loadDir('.').then(({ entries, error }) => {
      setRoot((prev) =>
        prev
          ? { ...prev, loading: false, error, children: sortEntries(entries).map((e) => toNode(e, '.')) }
          : prev,
      )
    })
  }

  useEffect(() => {
    const off = window.lexentia.fs.onDirChanged(({ relPath }) => {
      if (!root) return
      if (relPath === '.') {
        void refreshDirNode('.')
        return
      }
      void refreshDirNode(relPath)
    })
    return () => off()
  }, [root])

  useEffect(() => {
    return () => {
      for (const rel of watchedDirsRef.current) {
        void window.lexentia.fs.unwatchDir(rel)
      }
    }
  }, [])

  const collapseAll = () => {
    const patch = (n: TreeNode): TreeNode => ({
      ...n,
      expanded: n.isDir ? false : n.expanded,
      children: n.children ? n.children.map(patch) : n.children,
    })
    setRoot((prev) => (prev ? patch(prev) : prev))
  }

  const expandAllLoaded = () => {
    const patch = (n: TreeNode): TreeNode => ({
      ...n,
      expanded: n.isDir ? Boolean(n.children) || n.expanded : n.expanded,
      children: n.children ? n.children.map(patch) : n.children,
    })
    setRoot((prev) => (prev ? patch(prev) : prev))
  }

  const copySelectedPath = async () => {
    const txt = selectedRelPath ?? workspaceRoot ?? ''
    if (!txt) return
    await navigator.clipboard.writeText(txt)
  }

  const createNewFolder = async () => {
    const name = window.prompt('New folder name:', 'new-folder')
    if (!name) return
    if (!workspaceRoot) return
    const folderPath = selectedRelPath ? `${selectedRelPath}/${name}` : name
    try {
      // Create by writing a placeholder file inside it
      await window.lexentia.fs.writeFile(`${folderPath}/.placeholder`, '')
      refreshRoot()
    } catch (e) {
      console.warn('Failed to create folder:', e)
    }
  }

  const toggleDir = async (node: TreeNode) => {
    if (!node.isDir) return
    const willExpand = !node.expanded

    if (!willExpand) {
      setRoot((prev) => (prev ? patchNode(prev, node.relPath, (n) => ({ ...n, expanded: false })) : prev))
      if (watchedDirs.has(node.relPath)) {
        void window.lexentia.fs.unwatchDir(node.relPath)
        setWatchedDirs((prev) => {
          const next = new Set(prev)
          next.delete(node.relPath)
          watchedDirsRef.current = next
          return next
        })
      }
      return
    }

    setRoot((prev) =>
      prev
        ? patchNode(prev, node.relPath, (n) => ({
            ...n,
            expanded: true,
            loading: !n.children,
          }))
        : prev,
    )

    if (!watchedDirs.has(node.relPath)) {
      void window.lexentia.fs.watchDir(node.relPath)
      setWatchedDirs((prev) => {
        const next = new Set([...prev, node.relPath])
        watchedDirsRef.current = next
        return next
      })
    }

    await refreshDirNode(node.relPath)
  }

  return (
    <div className="lex-explorer">
      <div className="lex-explorerHeader">
        <div className="lex-field lex-field--row">
          <button className="lex-btn lex-btn--primary" onClick={openFolder}>
            Open Folder
          </button>
          {root ? (
            <>
              <button className="lex-btn" onClick={() => void createNewFolder()} title="New folder (Ctrl+Shift+N)">
                + Folder
              </button>
              <button className="lex-btn" onClick={refreshRoot} title="Refresh">
                ↺
              </button>
              <button className="lex-btn" onClick={collapseAll} title="Collapse all">
                Collapse
              </button>
              <button className="lex-btn" onClick={expandAllLoaded} title="Expand loaded">
                Expand
              </button>
              <button className="lex-btn" onClick={() => void copySelectedPath()} title="Copy selected path">
                Copy path
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="lex-subtle" style={{ marginBottom: 10 }}>
        {workspaceRoot ?? 'No folder selected'}
      </div>
      {selectedRelPath ? <div className="lex-subtle" style={{ marginTop: -4, marginBottom: 10 }}>Selected: {selectedRelPath}</div> : null}

      <div className="lex-tree" role="tree" aria-label="File tree">
        {!root ? (
          <div className="lex-empty">Open a project folder.</div>
        ) : (
          <TreeNodeView
            node={root}
            depth={0}
            onToggle={toggleDir}
            onOpenFile={onOpenFile}
            onOpenFileInNewTab={onOpenFileInNewTab}
            selectedRelPath={selectedRelPath}
            onSelectRelPath={(p) => setSelectedRelPath(p)}
            onAttachToChat={onAttachToChat}
          />
        )}
      </div>
    </div>
  )
}

function TreeNodeView({
  node,
  depth,
  onToggle,
  onOpenFile,
  onOpenFileInNewTab,
  selectedRelPath,
  onSelectRelPath,
  onAttachToChat,
}: {
  node: TreeNode
  depth: number
  onToggle: (node: TreeNode) => void
  onOpenFile: (relPath: string) => void
  onOpenFileInNewTab?: (relPath: string) => void
  selectedRelPath: string | null
  onSelectRelPath: (relPath: string) => void
  onAttachToChat?: (relPath: string) => void
}) {
  const indent = 10 + depth * 12
  
  const createMenuButton = (text: string, onClick: () => void) => {
    const button = document.createElement('button')
    button.textContent = text
    button.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--text);
      cursor: pointer;
      text-align: left;
      font-size: 12px;
      font-family: inherit;
    `
    button.onmouseover = () => {
      button.style.background = 'var(--bg-raised)'
    }
    button.onmouseout = () => {
      button.style.background = 'none'
    }
    button.onclick = onClick
    return button
  }
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const menu = document.createElement('div')
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-dim);
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 160px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `
    
    const closeMenu = () => {
      if (menu.parentNode) document.body.removeChild(menu)
      document.removeEventListener('click', closeMenu)
    }
    
    // Open option (for files)
    if (!node.isDir) {
      menu.appendChild(createMenuButton('Open', () => {
        closeMenu()
        onOpenFile(node.relPath)
      }))
      
      // Open in new tab
      if (onOpenFileInNewTab) {
        menu.appendChild(createMenuButton('Open in new tab', () => {
          closeMenu()
          onOpenFileInNewTab(node.relPath)
        }))
      }
    }
    
    // Attach to chat (for files only)
    if (!node.isDir && onAttachToChat) {
      menu.appendChild(createMenuButton('Attach to chat', () => {
        closeMenu()
        onAttachToChat(node.relPath)
      }))
    }
    
    // Copy path
    menu.appendChild(createMenuButton('Copy path', () => {
      closeMenu()
      void navigator.clipboard.writeText(node.relPath)
    }))
    
    document.body.appendChild(menu)
    document.addEventListener('click', closeMenu)
  }
  
  return (
    <div>
      <div
        className={
          node.isDir ? (node.relPath === selectedRelPath ? 'lex-treeRow lex-treeRow--selected lex-treeRow--dir' : 'lex-treeRow lex-treeRow--dir') : node.relPath === selectedRelPath ? 'lex-treeRow lex-treeRow--selected' : 'lex-treeRow'
        }
        style={{ paddingLeft: indent }}
        onClick={() => {
          onSelectRelPath(node.relPath)
          if (node.isDir) onToggle(node)
          else onOpenFile(node.relPath)
        }}
        onContextMenu={handleContextMenu}
        role="treeitem"
        aria-expanded={node.isDir ? !!node.expanded : undefined}
      >
        <span className="lex-treeIcon">{node.isDir ? (node.expanded ? '▾' : '▸') : <TreeFileIcon fileName={node.name} />}</span>
        <span className="lex-treeName">{node.name}</span>
        {node.loading ? <span className="lex-treeMeta">loading…</span> : null}
        {node.error ? <span className="lex-treeMeta" style={{ color: '#f87171' }} title={node.error}>⚠</span> : null}
      </div>
      {node.isDir && node.expanded && node.children ? (
        <div role="group">
          {node.children.length === 0 ? (
            <div className="lex-empty" style={{ paddingLeft: indent + 16 }}>empty</div>
          ) : (
            node.children.map((c) => (
              <TreeNodeView
                key={c.id}
                node={c}
                depth={depth + 1}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
                onOpenFileInNewTab={onOpenFileInNewTab}
                selectedRelPath={selectedRelPath}
                onSelectRelPath={onSelectRelPath}
                onAttachToChat={onAttachToChat}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

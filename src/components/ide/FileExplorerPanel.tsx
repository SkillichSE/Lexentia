import { useCallback, useEffect, useState, type ReactNode } from 'react'

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

export function FileExplorerPanel({
  onOpenFile,
  onWorkspaceChanged,
  openFolderSignal,
  resyncDir,
}: {
  onOpenFile: (relPath: string) => void
  onWorkspaceChanged?: (workspaceRoot: string | null) => void
  openFolderSignal?: number
  /** After creating a file, parent dir rel path (e.g. "." or "src") to reload in tree */
  resyncDir?: { key: number; dir: string }
}) {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [root, setRoot] = useState<TreeNode | null>(null)

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
    if (!openFolderSignal) return
    void openFolder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFolderSignal])

  const reloadDirectoryInTree = async (relPath: string) => {
    const { entries, error } = await loadDir(relPath)
    setRoot((prev) => {
      if (!prev) return prev
      if (relPath === '.') {
        return { ...prev, loading: false, error, children: entries.map((e) => toNode(e, '.')) }
      }
      return patchNode(prev, relPath, (n) => ({
        ...n,
        loading: false,
        error,
        expanded: true,
        children: entries.map((e) => toNode(e, relPath)),
      }))
    })
  }

  useEffect(() => {
    if (!resyncDir || !root) return
    void reloadDirectoryInTree(resyncDir.dir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resyncDir?.key])

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
              children: entries.map((e) => toNode(e, '.')),
            }
          : prev,
      )
    })
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
          ? { ...prev, loading: false, error, children: entries.map((e) => toNode(e, '.')) }
          : prev,
      )
    })
  }

  const toggleDir = async (node: TreeNode) => {
    if (!node.isDir) return
    const willExpand = !node.expanded

    if (!willExpand) {
      setRoot((prev) => (prev ? patchNode(prev, node.relPath, (n) => ({ ...n, expanded: false })) : prev))
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

    // Lazy load children only if not already loaded
    if (node.children) return

    const { entries, error } = await loadDir(node.relPath)
    setRoot((prev) =>
      prev
        ? patchNode(prev, node.relPath, (n) => ({
            ...n,
            loading: false,
            error,
            children: entries.map((e) => toNode(e, node.relPath)),
          }))
        : prev,
    )
  }

  return (
    <div className="lex-explorer">
      <div className="lex-explorerHeader">
        <div className="lex-sectionTitle">Explorer</div>
        <div className="lex-explorerActions">
          <button className="lex-btn lex-btn--primary" onClick={openFolder}>
            Open Folder
          </button>
          {root ? (
            <button className="lex-btn" type="button" onClick={refreshRoot} title="Refresh">
              ↻
            </button>
          ) : null}
        </div>
      </div>
      <div className="lex-subtle" style={{ marginBottom: 10 }}>
        {workspaceRoot ?? 'No folder selected'}
      </div>

      <div className="lex-tree" role="tree" aria-label="File tree">
        {!root ? (
          <div className="lex-empty">Open a project folder.</div>
        ) : (
          <TreeNodeView node={root} depth={0} onToggle={toggleDir} onOpenFile={onOpenFile} />
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
}: {
  node: TreeNode
  depth: number
  onToggle: (node: TreeNode) => void
  onOpenFile: (relPath: string) => void
}) {
  const indent = 10 + depth * 12

  const ext = !node.isDir && node.name.includes('.') ? node.name.split('.').pop()?.toLowerCase() : ''
  const fileColor = (() => {
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '#3178c6'
      case 'js':
      case 'jsx':
        return '#f1e05a'
      case 'json':
        return '#f2c94c'
      case 'md':
        return '#f5b301'
      case 'css':
      case 'scss':
        return '#563d7c'
      case 'html':
        return '#e34c26'
      case 'py':
        return '#3572A5'
      case 'yml':
      case 'yaml':
        return '#cb171e'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
        return '#4ade80'
      default:
        return '#cccccc'
    }
  })()

  const stroke = 1.15
  const FolderIcon = ({ open }: { open: boolean }) =>
    open ? (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 6h4l1 1h7v7H2V6z"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <path
          d="M2 6V5h4l1 1"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 6h4l1 1h7v7H2V6z"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <path
          d="M2 6V4.5h4.5L8 6"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )

  const swSym = 1.08
  const FileIcon = () => {
    const symProps = {
      width: 14,
      height: 14,
      viewBox: '0 0 16 16',
      fill: 'none' as const,
      'aria-hidden': true as const,
    }
    const g = (children: ReactNode) => (
      <svg {...symProps}>
        <g stroke="currentColor" strokeWidth={swSym} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {children}
        </g>
      </svg>
    )

    switch (ext) {
      case 'html':
      case 'htm':
        return g(
          <>
            <path d="M9.4 4.6 L5.6 8 L9.4 11.4" />
            <path d="M7.05 4.05 L9.25 11.95" />
            <path d="M6.6 4.6 L10.4 8 L6.6 11.4" />
          </>,
        )
      case 'json':
        return g(
          <>
            <path d="M9.25 4.35c-1.15.45-1.55 1.55-1.55 3.65s.4 3.2 1.55 3.65" />
            <path d="M6.75 4.35c1.15.45 1.55 1.55 1.55 3.65s-.4 3.2-1.55 3.65" />
          </>,
        )
      case 'md':
        return g(
          <>
            <path d="M7.2 4.2h2.4M8.4 4.2v7.6" />
            <path d="M5.4 8.2h3.2M5.4 10h3.2M5.4 11.8h2.4" />
          </>,
        )
      case 'css':
      case 'scss':
        return g(
          <>
            <path d="M8 4v8" />
            <path d="M5.2 6h5.6" />
            <path d="M5.2 10h5.6" />
          </>,
        )
      case 'py':
        return g(
          <>
            <circle cx="8" cy="6.1" r="0.85" />
            <circle cx="8" cy="10.2" r="0.85" />
          </>,
        )
      case 'yml':
      case 'yaml':
        return g(
          <>
            <path d="M5.5 7h2.2M5.5 9.8h2.2" />
            <path d="M9.3 6.2v3.6M10.1 7.8h1.3" />
          </>,
        )
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
        return g(
          <>
            <path d="M4 5.5h8v7H4z" />
            <path d="M4.5 11.2L6.6 9l1.6 2 2.4-3.4 1.9 3.6" />
          </>,
        )
      case 'ts':
      case 'tsx':
        return g(
          <>
            <path d="M5.8 5h3.6M7.6 5v5.8" />
            <path d="M10.2 7.2c1.2 0 1.8.55 1.8 1.35 0 .95-.85 1.25-1.75 1.25-.35 0-.7-.05-.95-.15" />
            <path d="M10.35 10.05c.45.35 1 .55 1.55.55.75 0 1.35-.35 1.35-.95 0-1.1-1.7-.7-1.7-2 0-.95.75-1.45 1.85-1.45.5 0 1 .1 1.35.35" />
          </>,
        )
      case 'js':
      case 'jsx':
        return g(
          <>
            <path d="M10.2 5.2v5.2c0 .9-.45 1.35-1.25 1.35h-.4" />
            <path d="M10.35 10.05c.45.35 1 .55 1.55.55.75 0 1.35-.35 1.35-.95 0-1.1-1.7-.7-1.7-2 0-.95.75-1.45 1.85-1.45.5 0 1 .1 1.35.35" />
          </>,
        )
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M5 2h4.5L12 4.5V14H5V2z"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <path d="M9.5 2v3.5H12" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
          </svg>
        )
    }
  }

  const Chevron = () => (
    <span
      className={node.expanded ? 'lex-treeChevron lex-treeChevron--expanded' : 'lex-treeChevron'}
      aria-hidden="true"
    >
      {'>'}
    </span>
  )

  return (
    <div>
      <div
        className={node.isDir ? 'lex-treeRow lex-treeRow--dir' : 'lex-treeRow'}
        style={{ paddingLeft: indent }}
        onClick={() => (node.isDir ? onToggle(node) : onOpenFile(node.relPath))}
        role="treeitem"
        aria-expanded={node.isDir ? !!node.expanded : undefined}
      >
        <span className="lex-treeIcon">{node.isDir ? <Chevron /> : <span />}</span>
        <span className="lex-treeIcon" style={{ color: node.isDir ? 'var(--text-muted)' : fileColor }}>
          {node.isDir ? <FolderIcon open={!!node.expanded} /> : <FileIcon />}
        </span>
        <span className="lex-treeName">{node.name}</span>
        {node.loading ? <span className="lex-treeMeta">loading…</span> : null}
        {node.error ? <span className="lex-treeMeta" style={{ color: '#f87171' }} title={node.error}>⚠</span> : null}
      </div>
      {node.isDir && node.expanded && node.children ? (
        <div role="group">
          {node.children.length === 0 ? (
            <div className="lex-empty" style={{ paddingLeft: indent + 16 }}>
              empty
            </div>
          ) : (
            node.children.map((c) => (
              <TreeNodeView key={c.id} node={c} depth={depth + 1} onToggle={onToggle} onOpenFile={onOpenFile} />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

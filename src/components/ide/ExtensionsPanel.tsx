import { useEffect, useState, useRef } from 'react'
import { useNotification } from './NotificationContext'

type OpenVSXExtension = {
  name: string
  namespace: string
  version: string
  displayName: string
  description: string
  downloadCount: number
  averageRating: number
  reviewCount: number
  verified: boolean
}

type InstalledExtension = {
  namespace: string
  name: string
  displayName: string
  version: string
  description: string
  installedAt: number
}

type SearchResult = {
  extensions: OpenVSXExtension[]
  offset: number
  totalSize: number
}

export function ExtensionsPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [extensions, setExtensions] = useState<OpenVSXExtension[]>([])
  const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<{ [key: string]: boolean }>({})
  const [offset, setOffset] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [commands, setCommands] = useState<string[]>([])
  const [executingCommand, setExecutingCommand] = useState<string | null>(null)
  const [commandResult, setCommandResult] = useState<any>(null)
  const { showNotification } = useNotification()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const LIMIT = 20

  const searchExtensions = async (q: string, off = 0, append = false) => {
    setLoading(true)
    try {
      const isSearch = q.trim().length > 0
      const query = isSearch ? q.trim() : 'lang:' // Use a minimal query for popular
      
      // Build URL - use the correct API endpoint
      const url = new URL('https://open-vsx.org/api/-/search')
      url.searchParams.set('query', query)
      url.searchParams.set('offset', String(off))
      url.searchParams.set('size', String(LIMIT))
      if (!isSearch) {
        url.searchParams.set('sortOrder', 'desc')
        url.searchParams.set('sortBy', 'downloadCount')
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data: SearchResult = await response.json()
      
      if (data.extensions && Array.isArray(data.extensions)) {
        setExtensions((prev) => (append && prev.length > 0 ? [...prev, ...data.extensions] : data.extensions))
        setTotalSize(data.totalSize || 0)
        setOffset(off)
      } else {
        if (!append) setExtensions([])
      }
    } catch (error) {
      console.error('Failed to search extensions:', error)
      if (!append) setExtensions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setOffset(0)
    setIsInitialLoad(false)
    void searchExtensions(q, 0, false)
  }

  const loadInstalled = async () => {
    try {
      const res = await window.lexentia.extension.getInstalled()
      if (res.ok) {
        setInstalledExtensions(res.installed)
      }
    } catch (e) {
      console.error('Cannot load installed extensions', e)
    }
  }

  const loadCommands = async () => {
    try {
      const res = await window.lexentia.extension.getCommands()
      if (res.ok) {
        setCommands(res.commands)
      }
    } catch (e) {
      console.error('Cannot load extension commands', e)
    }
  }

  const executeCommand = async (commandId: string) => {
    setExecutingCommand(commandId)
    setCommandResult(null)
    try {
      const res = await window.lexentia.extension.executeCommand(commandId)
      if (res.ok) {
        setCommandResult(res.result)
      } else {
        setCommandResult(`Error: ${res.error}`)
      }
    } catch (e) {
      setCommandResult(`Execution failed: ${e}`)
    } finally {
      setExecutingCommand(null)
    }
  }

  const installExtension = async (ext: OpenVSXExtension) => {
    const key = `${ext.namespace}.${ext.name}`
    setInstalling((prev) => ({ ...prev, [key]: true }))
    showNotification(`Installing ${ext.namespace}.${ext.name}...`, 'info')
    try {
      const res = await window.lexentia.extension.install(ext.namespace, ext.name)
      if (!res.ok) {
        console.error('Install failed', res.error)
        showNotification(`Install failed: ${res.error ?? 'Unknown error'}`, 'error')
      } else {
        if (res.installed) {
          setInstalledExtensions(res.installed)
        }
        if (res.commands) {
          setCommands(res.commands)
        }
        showNotification(`Installed ${ext.namespace}.${ext.name} successfully`, 'success')
      }
    } catch (e) {
      console.error('Install failed', e)
      showNotification(`Install failed: ${String(e)}`, 'error')
    } finally {
      setInstalling((prev) => ({ ...prev, [key]: false }))
    }
  }

  const openInOpenVSX = (namespace: string, name: string) => {
    window.open(`https://open-vsx.org/extension/${namespace}/${name}`, '_blank')
  }

  // Load popular extensions + installed extensions on mount
  useEffect(() => {
    void searchExtensions('', 0, false)
    void loadInstalled()
    void loadCommands()
  }, [])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && extensions.length > 0 && offset + LIMIT < totalSize) {
          const nextOffset = offset + LIMIT
          void searchExtensions(searchQuery, nextOffset, true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, extensions.length, offset, totalSize, searchQuery])

  return (
    <div className="lex-sideSection">
      <div className="lex-sectionTitle">Extensions</div>
      <input
        type="text"
        className="lex-input"
        placeholder="Search extensions..."
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        style={{ marginBottom: 12, width: '100%' }}
      />

      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: 8 }}>
        {!isInitialLoad && totalSize > 0 && <div>Found {totalSize} extensions</div>}
        {!isInitialLoad && extensions.length === 0 && !loading && <div>No extensions found</div>}
        {isInitialLoad && extensions.length > 0 && <div>Popular extensions</div>}
      </div>

      <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        {loading && extensions.length === 0 ? (
          <div className="lex-subtle">Loading extensions...</div>
        ) : extensions.length === 0 ? (
          <div className="lex-subtle" style={{ textAlign: 'center', marginTop: 24 }}>
            <p>No extensions available</p>
          </div>
        ) : (
          <>
            {extensions.map((ext) => {
              const key = `${ext.namespace}.${ext.name}`
              const installed = installedExtensions.some((i) => i.namespace === ext.namespace && i.name === ext.name)
              return (
                <div
                  key={key}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ext.displayName || ext.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: 4 }}>
                        {ext.namespace} · v{ext.version}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text)',
                          marginBottom: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {ext.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: 12 }}>
                        <span>⭐ {ext.averageRating?.toFixed(1) || 'N/A'}</span>
                        <span>📥 {ext.downloadCount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="lex-btn lex-btn--small"
                        type="button"
                        onClick={() => openInOpenVSX(ext.namespace, ext.name)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        View
                      </button>
                      <button
                        className="lex-btn lex-btn--small"
                        type="button"
                        onClick={() => installExtension(ext)}
                        disabled={installed || installing[key]}
                      >
                        {installed ? 'Installed' : installing[key] ? 'Installing...' : 'Install'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Infinite scroll sentinel */}
            <div
              ref={sentinelRef}
              style={{
                height: '1px',
                visibility: 'hidden',
              }}
            />
            {loading && extensions.length > 0 && (
              <div className="lex-subtle" style={{ textAlign: 'center', padding: '12px' }}>
                Loading more...
              </div>
            )}
          </>
        )}
      </div>

      {installedExtensions.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <div className="lex-sectionTitle lex-sectionTitle--small">Installed extensions</div>
          {installedExtensions.map((inst) => (
            <div key={`${inst.namespace}.${inst.name}`} style={{ fontSize: 12, marginTop: 6 }}>
              <strong>{inst.displayName}</strong> ({inst.namespace}.{inst.name}) v{inst.version}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
        <div className="lex-sectionTitle lex-sectionTitle--small">Extension Commands</div>
        {commands.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>No registered commands yet.</div>
        ) : (
          <div style={{ marginTop: 6 }}>
            {commands.map((cmd) => (
              <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{cmd}</span>
                <button
                  className="lex-btn lex-btn--small"
                  type="button"
                  onClick={() => executeCommand(cmd)}
                  disabled={executingCommand !== null}
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="lex-btn lex-btn--small" type="button" onClick={() => void loadCommands()}>
            Refresh commands
          </button>
          {executingCommand && <span style={{ fontSize: 12 }}>Executing {executingCommand}...</span>}
        </div>
        {commandResult !== null && (
          <div style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            <strong>Result:</strong> {typeof commandResult === 'string' ? commandResult : JSON.stringify(commandResult, null, 2)}
          </div>
        )}
      </div>
    </div>
  )
}

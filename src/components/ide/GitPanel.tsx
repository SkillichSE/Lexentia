import { useEffect, useMemo, useState } from 'react'

type GitStatusFile = {
  path: string
  index: string
  worktree: string
  status: string
}

type GitStatusResult = {
  ok: boolean
  output: string
  error?: string
}

type GitBranchInfo = {
  branch: string
  remote?: string
  ahead: number
  behind: number
}

type GitCommit = {
  hash: string
  author: string
  date: string
  message: string
}

function parseGitStatus(raw: string): { branchInfo: GitBranchInfo; files: GitStatusFile[] } {
  const lines = raw.split('\n').filter((line) => line.trim() !== '')
  const branchLine = lines[0] ?? ''
  let branchInfo: GitBranchInfo = { branch: '', ahead: 0, behind: 0 }

  if (branchLine.startsWith('##')) {
    const branchMatch = branchLine.match(/^##\s+([^\.\s]+)(?:\.\.\.([^\s\[]+))?(?:\s*\[(.+)\])?/) as RegExpMatchArray | null
    if (branchMatch) {
      branchInfo.branch = branchMatch[1] || ''
      if (branchMatch[2]) branchInfo.remote = branchMatch[2]
      if (branchMatch[3]) {
        const aheadMatch = branchMatch[3].match(/ahead\s+(\d+)/)
        const behindMatch = branchMatch[3].match(/behind\s+(\d+)/)
        branchInfo.ahead = aheadMatch ? Number(aheadMatch[1]) : 0
        branchInfo.behind = behindMatch ? Number(behindMatch[1]) : 0
      }
    }
  }

  const files = lines
    .slice(branchInfo.branch ? 1 : 0)
    .map((line) => {
      const index = line.slice(0, 1)
      const worktree = line.slice(1, 2)
      const path = line.slice(3).trim()
      const statusParts = []
      if (index !== ' ' && index !== '?') statusParts.push(`staged ${index}`)
      if (worktree !== ' ' && worktree !== '?') statusParts.push(`modified ${worktree}`)
      if (index === '?' && worktree === '?') statusParts.push('untracked')
      if (index === 'D' || worktree === 'D') statusParts.push('deleted')
      if (index === 'A' || worktree === 'A') statusParts.push('added')
      return {
        path,
        index,
        worktree,
        status: statusParts.length > 0 ? statusParts.join(', ') : 'clean',
      }
    })

  return { branchInfo, files }
}

export function GitPanel({ workspaceRoot }: { workspaceRoot: string | null }) {
  const [branchInfo, setBranchInfo] = useState<GitBranchInfo>({ branch: '', ahead: 0, behind: 0 })
  const [files, setFiles] = useState<GitStatusFile[]>([])
  const [loading, setLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [operationLog, setOperationLog] = useState<string>('')
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [activeTab, setActiveTab] = useState<'changes' | 'history'>('changes')
  const [commitHistory, setCommitHistory] = useState<GitCommit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const hasGit = useMemo(() => workspaceRoot !== null, [workspaceRoot])

  const appendLog = (text: string) => {
    setOperationLog((prev) => `${prev}${prev ? '\n' : ''}${text}`)
  }

  const runGit = async (command: string, args: string[]): Promise<GitStatusResult> => {
    if (!workspaceRoot) return { ok: false, output: '', error: 'Workspace not set' }
    try {
      const result = await window.lexentia.git.run(command, args)
      return result as GitStatusResult
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, output: '', error: message }
    }
  }

  const loadStatus = async () => {
    setLoading(true)
    setIsGitRepo(false)

    if (!workspaceRoot) {
      setLoading(false)
      return
    }

    const check = await runGit('rev-parse', ['--is-inside-work-tree'])
    if (!check.ok || (check.output.trim() !== 'true' && check.output.trim() !== '1')) {
      setIsGitRepo(false)
      setBranchInfo({ branch: '', ahead: 0, behind: 0 })
      setFiles([])
      setLoading(false)
      return
    }

    const topLevel = await runGit('rev-parse', ['--show-toplevel'])
    const repoRoot = topLevel.output.trim().replace(/\\/g, '/').replace(/\/+$/, '')
    const workspaceNormalized = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '')
    if (!topLevel.ok || repoRoot.toLowerCase() !== workspaceNormalized.toLowerCase()) {
      setIsGitRepo(false)
      setBranchInfo({ branch: '', ahead: 0, behind: 0 })
      setFiles([])
      setLoading(false)
      return
    }

    setIsGitRepo(true)
    const res = await runGit('status', ['--short', '--branch'])
    if (!res.ok) {
      appendLog(`status failed: ${res.error ?? '[unknown]'}`)
      setBranchInfo({ branch: '', ahead: 0, behind: 0 })
      setFiles([])
      setLoading(false)
      return
    }
    const parsed = parseGitStatus(res.output)
    setBranchInfo(parsed.branchInfo)
    setFiles(parsed.files)
    setLoading(false)
    // Load commit history after status is loaded
    if (activeTab === 'history') {
      await loadCommitHistory()
    }
  }

  const doStage = async (path: string) => {
    if (!isGitRepo) return
    const res = await runGit('add', [path])
    appendLog(`git add ${path} -> ${res.ok ? 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doUnstage = async (path: string) => {
    const res = await runGit('reset', ['--', path])
    appendLog(`git reset -- ${path} -> ${res.ok ? 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doCommit = async () => {
    if (!commitMessage.trim()) return
    const res = await runGit('commit', ['-m', commitMessage.trim()])
    appendLog(`git commit -> ${res.ok ? 'ok' : `failed: ${res.error}`}`)
    setCommitMessage('')
    await loadStatus()
  }

  const doFetch = async () => {
    const res = await runGit('fetch', ['origin'])
    appendLog(`git fetch origin -> ${res.ok ? 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doPull = async () => {
    const res = await runGit('pull', ['origin', branchInfo.branch || ''])
    appendLog(`git pull origin ${branchInfo.branch || ''} -> ${res.ok ? res.output || 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doPush = async () => {
    if (!isGitRepo) return
    const res = await runGit('push', ['origin', branchInfo.branch || ''])
    appendLog(`git push origin ${branchInfo.branch || ''} -> ${res.ok ? res.output || 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doInit = async () => {
    if (!workspaceRoot) return
    const res = await runGit('init', [])
    appendLog(`git init -> ${res.ok ? res.output || 'ok' : `failed: ${res.error}`}`)
    await loadStatus()
  }

  const doDiff = async (path: string) => {
    if (!isGitRepo) return
    const res = await runGit('diff', ['--', path])
    appendLog(`git diff ${path}\n${res.ok ? res.output : `failed: ${res.error}`}`)
  }

  const loadCommitHistory = async () => {
    if (!isGitRepo) return
    setLoadingHistory(true)
    const res = await runGit('log', [
      '--pretty=format:%H%n%an%n%ai%n%s%n--END--',
      '-20',
    ])
    if (res.ok) {
      const commits: GitCommit[] = []
      const parts = res.output.split('--END--').filter((p) => p.trim())
      parts.forEach((part) => {
        const lines = part.trim().split('\n')
        if (lines.length >= 4) {
          commits.push({
            hash: lines[0] || '',
            author: lines[1] || '',
            date: lines[2] || '',
            message: lines[3] || '',
          })
        }
      })
      setCommitHistory(commits)
    }
    setLoadingHistory(false)
  }

  useEffect(() => {
    void loadStatus()
    void loadCommitHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRoot])

  if (!hasGit) {
    return (
      <div className="lex-sideSection">
        <div className="lex-sectionTitle">Git</div>
        <p className="lex-subtle">Open a folder first to use source control.</p>
      </div>
    )
  }

  if (!isGitRepo) {
    return (
      <div className="lex-sideSection">
        <div className="lex-sectionTitle">Git</div>
        <p className="lex-subtle">Folder is not a Git repository.</p>
        <button className="lex-btn lex-btn--primary" type="button" onClick={doInit}>
          Init repository
        </button>
      </div>
    )
  }

  return (
    <div className="lex-sideSection">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="lex-sectionTitle">Git</div>
        <button className="lex-btn lex-btn--small" type="button" onClick={loadStatus} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className="lex-field" style={{ marginBottom: 8 }}>
        <strong>Current repository:</strong> {workspaceRoot ? workspaceRoot.split(/[/\\]/).pop() || workspaceRoot : 'none'}
      </div>
      <div className="lex-field">
        <strong>Current branch:</strong> {branchInfo.branch || 'unknown'}
        {branchInfo.remote ? <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>({branchInfo.remote})</span> : null}
      </div>
      <div className="lex-field" style={{ marginTop: 4 }}>
        {branchInfo.ahead === 0 && branchInfo.behind === 0 ? (
          <span className="lex-subtle">Up to date with remote</span>
        ) : (
          <span className="lex-subtle">{branchInfo.ahead} ahead, {branchInfo.behind} behind</span>
        )}
      </div>
      <div className="lex-field" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
        <button className="lex-btn lex-btn--full" type="button" onClick={doFetch} disabled={loading}>
          Fetch origin
        </button>
        <button className="lex-btn lex-btn--full" type="button" onClick={doPull} disabled={loading || !branchInfo.branch}>
          Pull origin{branchInfo.behind > 0 ? ` (${branchInfo.behind})` : ''}
        </button>
        <button className="lex-btn lex-btn--full" type="button" onClick={doPush} disabled={loading || !branchInfo.branch}>
          Push origin{branchInfo.ahead > 0 ? ` (${branchInfo.ahead})` : ''}
        </button>
      </div>

      {/* Tab selector */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('changes')}
          style={{
            padding: '4px 12px',
            background: activeTab === 'changes' ? 'var(--bg-elevated)' : 'transparent',
            border: activeTab === 'changes' ? '1px solid var(--border-subtle)' : 'none',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: activeTab === 'changes' ? '600' : 'normal',
          }}
        >
          Changes
          {files.length > 0 && <span style={{ marginLeft: 4, color: 'var(--text-dim)' }}>({files.length})</span>}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('history')
            if (commitHistory.length === 0) void loadCommitHistory()
          }}
          style={{
            padding: '4px 12px',
            background: activeTab === 'history' ? 'var(--bg-elevated)' : 'transparent',
            border: activeTab === 'history' ? '1px solid var(--border-subtle)' : 'none',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: activeTab === 'history' ? '600' : 'normal',
          }}
        >
          History
        </button>
      </div>

      {/* Changes Tab */}
      {activeTab === 'changes' && (
        <>
          <div style={{ marginTop: 12, maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border-subtle)', padding: 8, borderRadius: 4, background: 'var(--bg-elevated)' }}>
            {loading ? (
              <div>Loading git status...</div>
            ) : files.length === 0 ? (
              <div className="lex-subtle">No local changes.</div>
            ) : (
              files.map((file) => (
                <div key={file.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div>
                    <strong>{file.path}</strong>
                    <div className="lex-subtle" style={{ fontSize: 11 }}>
                      {file.status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {file.index !== ' ' && file.index !== '?' ? (
                      <button className="lex-btn lex-btn--small" onClick={() => void doUnstage(file.path)}>
                        Unstage
                      </button>
                    ) : (
                      <button className="lex-btn lex-btn--small" onClick={() => void doStage(file.path)}>
                        Stage
                      </button>
                    )}
                    <button className="lex-btn lex-btn--small" onClick={() => void doDiff(file.path)}>
                      Diff
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lex-field" style={{ marginTop: 12 }}>
            <textarea
              className="lex-field"
              value={commitMessage}
              placeholder="Commit message"
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              style={{ width: '100%', resize: 'vertical', marginBottom: 6 }}
            />
            <button className="lex-btn lex-btn--primary" type="button" onClick={doCommit} disabled={loading || !commitMessage.trim()}>
              Commit
            </button>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ marginTop: 12, maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border-subtle)', padding: 8, borderRadius: 4, background: 'var(--bg-elevated)' }}>
          {loadingHistory ? (
            <div>Loading commit history...</div>
          ) : commitHistory.length === 0 ? (
            <div className="lex-subtle">No commits found.</div>
          ) : (
            commitHistory.map((commit) => (
              <div
                key={commit.hash}
                style={{
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-dim)',
                        fontFamily: 'monospace',
                        marginBottom: 2,
                      }}
                    >
                      {commit.hash.substring(0, 7)}
                    </div>
                    <strong style={{ display: 'block', marginBottom: 4, wordBreak: 'break-word' }}>{commit.message}</strong>
                    <div className="lex-subtle" style={{ fontSize: '11px' }}>
                      {commit.author} · {new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div className="lex-sectionTitle lex-sectionTitle--small">Git log</div>
        <pre style={{ maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text-dim)', marginTop: 4 }}>{operationLog || 'No activity yet.'}</pre>
      </div>
    </div>
  )
}

// git context for ai system prompt
// provides repository state as context to help the model understand the codebase

import { spawn } from 'node:child_process'

let workspaceRoot: string | null = null

export function setWorkspaceRoot(root: string | null) {
  workspaceRoot = root
}

export function getWorkspaceRoot(): string | null {
  return workspaceRoot
}

// run git command and return output
async function runGit(args: string[]): Promise<{ ok: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    if (!workspaceRoot) {
      resolve({ ok: false, output: '', error: 'workspace not set' })
      return
    }

    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'git.exe' : 'git'
    const proc = spawn(cmd, args, { cwd: workspaceRoot, shell: isWin, env: process.env })
    let output = ''
    let error = ''

    proc.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    proc.stderr.on('data', (chunk) => {
      error += String(chunk)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, output: output.trim() })
      } else {
        resolve({ ok: false, output: output.trim(), error: error.trim() || `git exited with code ${code}` })
      }
    })

    proc.on('error', (err) => {
      resolve({ ok: false, output: '', error: String(err) })
    })
  })
}

// check if current directory is a git repository
async function isGitRepo(): Promise<boolean> {
  const result = await runGit(['rev-parse', '--git-dir'])
  return result.ok
}

// get current branch name
async function getBranch(): Promise<string> {
  const result = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  return result.ok ? result.output : 'unknown'
}

// get default branch (main or master)
async function getDefaultBranch(): Promise<string> {
  const result = await runGit(['symbolic-ref', 'refs/remotes/origin/HEAD'])
  if (result.ok) {
    return result.output.replace('refs/remotes/origin/', '')
  }
  // fallback to common names
  const mainCheck = await runGit(['rev-parse', '--verify', 'main'])
  if (mainCheck.ok) return 'main'
  const masterCheck = await runGit(['rev-parse', '--verify', 'master'])
  if (masterCheck.ok) return 'master'
  return 'main'
}

// get git user name
async function getGitUser(): Promise<string | null> {
  const result = await runGit(['config', 'user.name'])
  return result.ok ? result.output : null
}

// get short status
async function getStatus(): Promise<string> {
  const result = await runGit(['status', '--short'])
  return result.ok ? result.output : ''
}

// get recent commits
async function getRecentCommits(count: number = 5): Promise<string> {
  const result = await runGit(['log', '--oneline', '-n', String(count)])
  return result.ok ? result.output : ''
}

const MAX_STATUS_CHARS = 2000

// get formatted git context for system prompt
export async function getGitContext(): Promise<string | null> {
  const isGit = await isGitRepo()
  if (!isGit) {
    return null
  }

  try {
    const [branch, defaultBranch, status, commits, user] = await Promise.all([
      getBranch(),
      getDefaultBranch(),
      getStatus(),
      getRecentCommits(5),
      getGitUser()
    ])

    // truncate status if too long
    const truncatedStatus = status.length > MAX_STATUS_CHARS
      ? status.substring(0, MAX_STATUS_CHARS) + '\n... (truncated)'
      : status || '(clean)'

    const lines = [
      'this is the git status at the start of the conversation.',
      `current branch: ${branch}`,
      `main branch for prs: ${defaultBranch}`,
    ]

    if (user) {
      lines.push(`git user: ${user}`)
    }

    lines.push(
      `status:\n${truncatedStatus}`,
      `recent commits:\n${commits}`
    )

    return lines.join('\n\n')
  } catch {
    return null
  }
}

// get context object for system prompt injection
export async function getGitContextObject(): Promise<Record<string, string>> {
  const gitContext = await getGitContext()
  if (!gitContext) {
    return {}
  }
  return { gitStatus: gitContext }
}

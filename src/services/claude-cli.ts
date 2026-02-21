import { execFile as execFileCb } from 'node:child_process'
import type { CliStatus, McpServer, Scope } from '@/shared/types'

const TIMEOUT_MS = 30_000

function execClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileCb(
      'claude',
      args,
      { timeout: TIMEOUT_MS },
      (err, stdout, _stderr) => {
        if (err) {
          reject(err)
          return
        }
        resolve(stdout)
      },
    )
  })
}

export async function checkCliAvailable(): Promise<CliStatus> {
  try {
    const stdout = await execClaude(['--version'])
    return { available: true, version: stdout.trim() }
  } catch {
    return {
      available: false,
      reason:
        'Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code',
    }
  }
}

export async function mcpAdd(
  name: string,
  config: Pick<McpServer, 'command' | 'args' | 'env'>,
  scope: Scope,
): Promise<void> {
  const cliScope = scope === 'global' ? 'user' : 'project'

  const args: string[] = ['mcp', 'add', name, '-s', cliScope]

  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      args.push('-e', `${key}=${value}`)
    }
  }

  if (config.command) {
    args.push('--', config.command)
  }

  if (config.args) {
    args.push(...config.args)
  }

  await execClaude(args)
}

export async function mcpRemove(name: string, scope: Scope): Promise<void> {
  const cliScope = scope === 'global' ? 'user' : 'project'
  await execClaude(['mcp', 'remove', name, '-s', cliScope])
}

export async function pluginToggle(id: string, enable: boolean): Promise<void> {
  const action = enable ? 'enable' : 'disable'
  await execClaude(['plugin', action, id])
}

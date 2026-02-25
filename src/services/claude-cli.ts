import { execFile as execFileCb } from "node:child_process"
import type { CliStatus, McpServer, PluginScope, Scope } from "@/shared/types"

const TIMEOUT_MS = 30_000

function execClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileCb(
      "claude",
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

async function fetchLatestVersion(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://registry.npmjs.org/@anthropic-ai/claude-code/latest",
    )
    if (!res.ok) return undefined
    const data = (await res.json()) as { version?: string }
    return data.version
  } catch {
    return undefined
  }
}

export async function checkCliAvailable(): Promise<CliStatus> {
  try {
    const [stdout, latestVersion] = await Promise.all([
      execClaude(["--version"]),
      fetchLatestVersion().catch(() => undefined),
    ])
    return { available: true, version: stdout.trim(), latestVersion }
  } catch {
    return {
      available: false,
      reason:
        "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code",
    }
  }
}

export async function mcpAdd(
  name: string,
  config: Pick<McpServer, "command" | "args" | "env">,
  scope: Scope,
): Promise<void> {
  const cliScope = scope === "global" ? "user" : "project"

  const args: string[] = ["mcp", "add", name, "-s", cliScope]

  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      args.push("-e", `${key}=${value}`)
    }
  }

  if (config.command) {
    args.push("--", config.command)
  }

  if (config.args) {
    args.push(...config.args)
  }

  await execClaude(args)
}

export async function mcpRemove(name: string, scope: Scope): Promise<void> {
  const cliScope = scope === "global" ? "user" : "project"
  await execClaude(["mcp", "remove", name, "-s", cliScope])
}

export async function pluginToggle(
  id: string,
  enable: boolean,
  scope?: PluginScope,
): Promise<void> {
  const action = enable ? "enable" : "disable"
  const args = ["plugin", action, id]
  if (scope) args.push("-s", scope)
  await execClaude(args)
}

export async function pluginInstall(
  name: string,
  scope: PluginScope = "user",
): Promise<void> {
  await execClaude(["plugin", "install", name, "-s", scope])
}

export async function pluginUninstall(
  name: string,
  scope: PluginScope = "user",
): Promise<void> {
  await execClaude(["plugin", "uninstall", name, "-s", scope])
}

export async function pluginUpdate(name: string): Promise<void> {
  await execClaude(["plugin", "update", name])
}

export async function marketplaceAdd(source: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "add", source])
}

export async function marketplaceRemove(name: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "remove", name])
}

export async function marketplaceUpdate(name: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "update", name])
}

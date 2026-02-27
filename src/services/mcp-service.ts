import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { getPlugins } from "@/services/plugin-service"
import type { McpConnectionStatus, McpServer, Scope } from "@/shared/types"

/**
 * MCP 서버 설정 읽기 서비스
 *
 * Claude Code는 MCP 서버를 다음 위치에 저장:
 * - User scope (global):  ~/.claude.json → 최상위 mcpServers
 * - Local scope:          ~/.claude.json → projects.{projectPath}.mcpServers
 * - Project scope:        {projectRoot}/.mcp.json → mcpServers
 *
 * @see https://code.claude.com/docs/en/mcp#mcp-installation-scopes
 */

// ── JSON 파싱 헬퍼 ──

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── MCP 서버 파싱 ──

function parseMcpServers(
  mcpServersRaw: Record<string, unknown>,
  scope: Scope,
  configPath?: string,
): McpServer[] {
  const servers: McpServer[] = []

  for (const [name, config] of Object.entries(mcpServersRaw)) {
    if (typeof config !== "object" || config === null) continue

    const c = config as Record<string, unknown>

    let type: McpServer["type"]
    if (c.type === "http" || c.type === "streamable-http") {
      type = "streamable-http"
    } else if (c.type === "sse") {
      type = "sse"
    } else if (c.command) {
      type = "stdio"
    } else if (c.url) {
      type = "sse"
    } else {
      type = "stdio"
    }

    servers.push({
      name,
      scope,
      type,
      command: c.command as string | undefined,
      args: c.args as string[] | undefined,
      url: c.url as string | undefined,
      env: c.env as Record<string, string> | undefined,
      disabled: c.disabled as boolean | undefined,
      configPath,
    })
  }

  return servers
}

// ── Public API ──

/**
 * 플러그인이 제공하는 MCP 서버 목록 조회
 *
 * 활성화된 플러그인의 installPath/.mcp.json을 읽어 반환한다.
 * - user scope 플러그인 → scope: "user"
 * - project scope 플러그인 → scope: "project"
 * 각 서버에 fromPlugin: pluginName 설정
 */
export async function getPluginMcpServers(
  projectPath?: string,
): Promise<McpServer[]> {
  const plugins = await getPlugins(projectPath)
  const results: McpServer[] = []

  await Promise.all(
    plugins
      .filter((plugin) => plugin.enabled && plugin.installPath)
      .map(async (plugin) => {
        const mcpJsonPath = path.join(plugin.installPath, ".mcp.json")
        const raw = await readJson(mcpJsonPath)
        // flat 형식 { serverName: config } 와 래퍼 형식 { mcpServers: { serverName: config } } 모두 지원
        const mcpServersRaw =
          typeof raw.mcpServers === "object" && raw.mcpServers !== null
            ? (raw.mcpServers as Record<string, unknown>)
            : (raw as Record<string, unknown>)

        const scope: Scope = plugin.scope === "project" ? "project" : "user"

        const servers = parseMcpServers(mcpServersRaw, scope, mcpJsonPath)
        for (const server of servers) {
          results.push({ ...server, fromPlugin: plugin.name })
        }
      }),
  )

  return results
}

/**
 * 모든 MCP 서버 목록 조회
 *
 * Global (user scope): ~/.claude.json → mcpServers
 * Local scope:         ~/.claude.json → projects.{projectPath}.mcpServers
 * Project scope:       {projectRoot}/.mcp.json → mcpServers
 */
export async function getMcpServers(
  projectPath?: string,
): Promise<McpServer[]> {
  const resolvedProjectPath = projectPath || process.cwd()
  const claudeJsonPath = path.join(os.homedir(), ".claude.json")
  const mcpJsonPath = path.join(resolvedProjectPath, ".mcp.json")

  const [claudeJson, mcpJson] = await Promise.all([
    readJson(claudeJsonPath),
    readJson(mcpJsonPath),
  ])

  // 1) User scope — top-level mcpServers in ~/.claude.json
  const userServers = claudeJson.mcpServers
    ? parseMcpServers(
        claudeJson.mcpServers as Record<string, unknown>,
        "user",
        claudeJsonPath,
      )
    : []

  // 2) Local scope — projects.{projectPath}.mcpServers in ~/.claude.json
  let localServers: McpServer[] = []
  if (claudeJson.projects) {
    const projects = claudeJson.projects as Record<string, unknown>
    const projectEntry = projects[resolvedProjectPath] as
      | Record<string, unknown>
      | undefined
    if (projectEntry?.mcpServers) {
      localServers = parseMcpServers(
        projectEntry.mcpServers as Record<string, unknown>,
        "user", // local scope도 user 개인 설정이므로 user로 표시
        claudeJsonPath,
      )
    }
  }

  // 3) Project scope — .mcp.json
  const projectServers = mcpJson.mcpServers
    ? parseMcpServers(
        mcpJson.mcpServers as Record<string, unknown>,
        "project",
        mcpJsonPath,
      )
    : []

  // 4) Apply disabled overrides from ~/.claude.json → projects.{path}.disabledMcpServers
  //    Claude Code stores per-project disable state here (not in .mcp.json's disabled field).
  const disabledSet = new Set<string>()
  if (claudeJson.projects) {
    const projects = claudeJson.projects as Record<string, unknown>
    const projectEntry = projects[resolvedProjectPath] as
      | Record<string, unknown>
      | undefined
    const disabledArr = projectEntry?.disabledMcpServers
    if (Array.isArray(disabledArr)) {
      for (const name of disabledArr) {
        if (typeof name === "string") disabledSet.add(name)
      }
    }
  }

  const applyDisabled = (server: McpServer): McpServer =>
    disabledSet.has(server.name) ? { ...server, disabled: true } : server

  // 5) Plugin MCP 서버 로드
  const pluginServers = await getPluginMcpServers(projectPath)

  const directServers = [
    ...userServers.map(applyDisabled),
    ...localServers.map(applyDisabled),
    ...projectServers.map(applyDisabled),
  ]

  // 6) 중복 감지: 직접 추가 서버 이름 Set
  const directNames = new Set(directServers.map((s) => s.name))
  const pluginNames = new Set(pluginServers.map((s) => s.name))

  const markedDirect = directServers.map((s) =>
    pluginNames.has(s.name) ? { ...s, isDuplicate: true } : s,
  )
  const markedPlugin = pluginServers.map((s) =>
    directNames.has(s.name) ? { ...s, isDuplicate: true } : s,
  )

  return [...markedDirect, ...markedPlugin]
}

export function parseMcpList(
  stdout: string,
): Record<string, McpConnectionStatus> {
  const result: Record<string, McpConnectionStatus> = {}

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("Checking")) continue

    // Output format: "{name}: {command_or_url} - {symbol} {status_text}"
    // e.g. "my-server: npx my-mcp - ✓ Connected"
    const match = trimmed.match(/^(.+?):\s+.+\s+-\s+(.+)$/)
    if (!match) continue

    const name = match[1].trim()
    const statusPart = match[2].trim()

    let status: McpConnectionStatus
    if (statusPart.startsWith("✓")) {
      status = "connected"
    } else if (statusPart.startsWith("!")) {
      status = "needs_authentication"
    } else if (statusPart.startsWith("✗")) {
      status = "failed"
    } else {
      status = "unknown"
    }

    result[name] = status
  }

  return result
}

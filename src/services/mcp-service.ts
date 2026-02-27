import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { McpServer, Scope } from "@/shared/types"

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
        "global",
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
        "global", // local scope도 user 개인 설정이므로 global로 표시
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

  return [...userServers, ...localServers, ...projectServers]
}

export function parseMcpList(
  stdout: string,
): Record<string, McpConnectionStatus> {
  const result: Record<string, McpConnectionStatus> = {}

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("Checking")) continue

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

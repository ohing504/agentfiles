import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import matter from "gray-matter"
import type {
  AgentFile,
  ClaudeMd,
  McpServer,
  Overview,
  Plugin,
  Scope,
} from "@/shared/types"

// ── 경로 헬퍼 ──

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".claude")
}

export function getProjectConfigPath(projectPath?: string): string {
  return path.join(projectPath ?? process.cwd(), ".claude")
}

// ── CLAUDE.md 읽기 ──

export async function getClaudeMd(
  scope: Scope,
  projectPath?: string,
): Promise<ClaudeMd | null> {
  const basePath =
    scope === "global"
      ? getGlobalConfigPath()
      : getProjectConfigPath(projectPath)
  const filePath = path.join(basePath, "CLAUDE.md")

  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ])

    return {
      scope,
      path: filePath,
      content,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw err
  }
}

// ── .md 파일 재귀 탐색 ──

export async function scanMdDir(
  basePath: string,
  type: AgentFile["type"],
): Promise<AgentFile[]> {
  const results: AgentFile[] = []

  async function walk(dir: string, namespace?: string): Promise<void> {
    let entries: Dirent[]

    try {
      entries = await fs.readdir(dir, {
        withFileTypes: true,
        encoding: "utf-8",
      })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return
      }
      throw err
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // 서브폴더명이 네임스페이스
        await walk(fullPath, entry.name)
      } else if (entry.isSymbolicLink()) {
        // symlink 처리
        if (entry.name.endsWith(".md")) {
          try {
            const [symlinkTarget, lstat, content] = await Promise.all([
              fs.readlink(fullPath),
              fs.lstat(fullPath),
              fs.readFile(fullPath, "utf-8").catch(() => ""),
            ])

            const parsed = matter(content)
            const name = entry.name.replace(/\.md$/, "")

            results.push({
              name,
              scope: "global",
              path: fullPath,
              namespace,
              frontmatter:
                Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
              size: lstat.size,
              lastModified: lstat.mtime.toISOString(),
              type,
              isSymlink: true,
              symlinkTarget,
            })
          } catch {
            // 심볼릭 링크 대상 없음 등 무시
          }
        } else {
          // 폴더 symlink인 경우 재귀 탐색
          try {
            const realPath = await fs.realpath(fullPath)
            const stat = await fs.stat(realPath)
            if (stat.isDirectory()) {
              await walk(fullPath, entry.name)
            }
          } catch {
            // 무효한 symlink 무시
          }
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const [content, stat] = await Promise.all([
            fs.readFile(fullPath, "utf-8"),
            fs.stat(fullPath),
          ])

          const parsed = matter(content)
          const name = entry.name.replace(/\.md$/, "")

          results.push({
            name,
            scope: "global",
            path: fullPath,
            namespace,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type,
            isSymlink: false,
          })
        } catch {
          // 읽기 실패 무시
        }
      }
    }
  }

  await walk(basePath)
  return results
}

// ── AgentFile 목록 + 스코프 자동 설정 ──

async function scanMdDirWithScope(
  basePath: string,
  type: AgentFile["type"],
  scope: Scope,
): Promise<AgentFile[]> {
  const files = await scanMdDir(basePath, type)
  return files.map((f) => ({ ...f, scope }))
}

// ── settings.json 파싱 헬퍼 ──

async function readSettingsJson(
  basePath: string,
): Promise<Record<string, unknown>> {
  const settingsPath = path.join(basePath, "settings.json")
  try {
    const content = await fs.readFile(settingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Plugin 목록 ──

export async function getPlugins(): Promise<Plugin[]> {
  const globalBase = getGlobalConfigPath()
  const pluginsJsonPath = path.join(
    globalBase,
    "plugins",
    "installed_plugins.json",
  )

  let rawData: Record<string, unknown> = {}
  try {
    const content = await fs.readFile(pluginsJsonPath, "utf-8")
    rawData = JSON.parse(content) as Record<string, unknown>
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw err
  }

  // settings.json에서 enabledPlugins 읽기
  const settings = await readSettingsJson(globalBase)
  const enabledPlugins = settings.enabledPlugins

  // enabledPlugins는 객체(id→boolean) 또는 배열(id[]) 형태 모두 지원
  function isEnabled(id: string): boolean {
    if (Array.isArray(enabledPlugins)) {
      return (enabledPlugins as string[]).includes(id)
    }
    if (enabledPlugins && typeof enabledPlugins === "object") {
      return (enabledPlugins as Record<string, boolean>)[id] === true
    }
    return false
  }

  // version 2: { version: 2, plugins: { "id@marketplace": [{ scope, installPath, ... }] } }
  const plugins: Plugin[] = []

  if (
    rawData.version === 2 &&
    rawData.plugins &&
    typeof rawData.plugins === "object"
  ) {
    const pluginsMap = rawData.plugins as Record<string, unknown[]>

    for (const [pluginId, entries] of Object.entries(pluginsMap)) {
      if (!Array.isArray(entries)) continue

      for (const entry of entries) {
        if (typeof entry !== "object" || entry === null) continue

        const e = entry as Record<string, unknown>
        const [name, marketplace] = pluginId.includes("@")
          ? pluginId.split("@")
          : [pluginId, ""]

        plugins.push({
          id: pluginId,
          name: name ?? pluginId,
          marketplace: marketplace ?? "",
          scope: (e.scope as "user" | "project") ?? "user",
          projectPath: e.projectPath as string | undefined,
          version: (e.version as string) ?? "",
          installedAt: (e.installedAt as string) ?? "",
          lastUpdated: (e.lastUpdated as string) ?? "",
          gitCommitSha: (e.gitCommitSha as string) ?? "",
          installPath: (e.installPath as string) ?? "",
          enabled: isEnabled(pluginId),
        })
      }
    }
  } else if (Array.isArray(rawData)) {
    // 레거시 배열 형태
    for (const entry of rawData as Record<string, unknown>[]) {
      if (typeof entry !== "object" || entry === null) continue
      const id = (entry.id as string) ?? ""
      plugins.push({
        id,
        name: (entry.name as string) ?? id,
        marketplace: (entry.marketplace as string) ?? "",
        scope: (entry.scope as "user" | "project") ?? "user",
        projectPath: entry.projectPath as string | undefined,
        version: (entry.version as string) ?? "",
        installedAt: (entry.installedAt as string) ?? "",
        lastUpdated: (entry.lastUpdated as string) ?? "",
        gitCommitSha: (entry.gitCommitSha as string) ?? "",
        installPath: (entry.installPath as string) ?? "",
        enabled: isEnabled(id),
      })
    }
  }

  return plugins
}

// ── MCP 서버 목록 ──

function parseMcpServers(
  mcpServersRaw: Record<string, unknown>,
  scope: Scope,
): McpServer[] {
  const servers: McpServer[] = []

  for (const [name, config] of Object.entries(mcpServersRaw)) {
    if (typeof config !== "object" || config === null) continue

    const c = config as Record<string, unknown>

    let type: McpServer["type"]
    if (c.command) {
      type = "stdio"
    } else if (c.url) {
      // streamable-http vs sse 구분: transportType 필드가 있으면 사용
      const transportType = c.transportType as string | undefined
      type = transportType === "streamable-http" ? "streamable-http" : "sse"
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
    })
  }

  return servers
}

export async function getMcpServers(
  projectPath?: string,
): Promise<McpServer[]> {
  const [globalSettings, projectSettings] = await Promise.all([
    readSettingsJson(getGlobalConfigPath()),
    readSettingsJson(getProjectConfigPath(projectPath)),
  ])

  const globalServers = globalSettings.mcpServers
    ? parseMcpServers(
        globalSettings.mcpServers as Record<string, unknown>,
        "global",
      )
    : []

  const projectServers = projectSettings.mcpServers
    ? parseMcpServers(
        projectSettings.mcpServers as Record<string, unknown>,
        "project",
      )
    : []

  return [...globalServers, ...projectServers]
}

// ── Overview 생성 ──

export async function getOverview(projectPath?: string): Promise<Overview> {
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  const [
    globalClaudeMd,
    projectClaudeMd,
    plugins,
    mcpServers,
    globalAgents,
    projectAgents,
    globalCommands,
    projectCommands,
    globalSkills,
    projectSkills,
  ] = await Promise.all([
    getClaudeMd("global"),
    getClaudeMd("project", projectPath),
    getPlugins(),
    getMcpServers(projectPath),
    scanMdDirWithScope(path.join(globalBase, "agents"), "agent", "global"),
    scanMdDirWithScope(path.join(projectBase, "agents"), "agent", "project"),
    scanMdDirWithScope(path.join(globalBase, "commands"), "command", "global"),
    scanMdDirWithScope(
      path.join(projectBase, "commands"),
      "command",
      "project",
    ),
    scanMdDirWithScope(path.join(globalBase, "skills"), "skill", "global"),
    scanMdDirWithScope(path.join(projectBase, "skills"), "skill", "project"),
  ])

  // 충돌 감지: 양쪽에 동일 name이 있는 항목 수
  function countConflicts(
    globalFiles: AgentFile[],
    projectFiles: AgentFile[],
  ): number {
    const globalNames = new Set(globalFiles.map((f) => f.name))
    return projectFiles.filter((f) => globalNames.has(f.name)).length
  }

  const conflictCount =
    countConflicts(globalAgents, projectAgents) +
    countConflicts(globalCommands, projectCommands) +
    countConflicts(globalSkills, projectSkills)

  const globalMcpCount = mcpServers.filter((s) => s.scope === "global").length
  const projectMcpCount = mcpServers.filter((s) => s.scope === "project").length

  const userPluginCount = plugins.filter((p) => p.scope === "user").length
  const projectPluginCount = plugins.filter((p) => p.scope === "project").length

  return {
    claudeMd: {
      global: globalClaudeMd ?? undefined,
      project: projectClaudeMd ?? undefined,
    },
    plugins: {
      total: plugins.length,
      user: userPluginCount,
      project: projectPluginCount,
    },
    mcpServers: {
      total: mcpServers.length,
      global: globalMcpCount,
      project: projectMcpCount,
    },
    agents: {
      total: globalAgents.length + projectAgents.length,
      global: globalAgents.length,
      project: projectAgents.length,
    },
    commands: {
      total: globalCommands.length + projectCommands.length,
      global: globalCommands.length,
      project: projectCommands.length,
    },
    skills: {
      total: globalSkills.length + projectSkills.length,
      global: globalSkills.length,
      project: projectSkills.length,
    },
    conflictCount,
  }
}

// ── 모든 AgentFile 반환 (타입별) ──

export async function getAgentFiles(
  type: AgentFile["type"],
  projectPath?: string,
): Promise<AgentFile[]> {
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  const dirName = `${type}s` // 'agent' → 'agents', 'command' → 'commands', 'skill' → 'skills'

  const [globalFiles, projectFiles] = await Promise.all([
    scanMdDirWithScope(path.join(globalBase, dirName), type, "global"),
    scanMdDirWithScope(path.join(projectBase, dirName), type, "project"),
  ])

  return [...globalFiles, ...projectFiles]
}

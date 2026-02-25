import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import matter from "gray-matter"
import type {
  AgentFile,
  ClaudeMd,
  HooksSettings,
  LspServer,
  McpServer,
  Overview,
  Plugin,
  PluginAuthor,
  PluginComponents,
  Scope,
  SupportingFile,
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

// ── Skills 디렉토리 스캔 (SKILL.md 기반 + flat .md) ──

/**
 * Scan .claude/skills/ directory for both directory-based skills (SKILL.md)
 * and flat .md files (legacy format)
 */
export async function scanSkillsDir(basePath: string): Promise<AgentFile[]> {
  const results: AgentFile[] = []
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name)

      if (entry.isDirectory()) {
        // Check if directory contains SKILL.md
        const skillMdPath = path.join(fullPath, "SKILL.md")
        try {
          const stat = await fs.stat(skillMdPath)
          const content = await fs.readFile(skillMdPath, "utf-8")
          const parsed = matter(content)

          // Collect supporting files
          const supportingFiles: SupportingFile[] = []
          await collectSupportingFiles(fullPath, fullPath, supportingFiles)

          results.push({
            name: entry.name,
            scope: "global", // will be overridden by caller
            path: skillMdPath,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: true,
            supportingFiles,
          })
        } catch {
          // No SKILL.md, skip
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Flat .md file (legacy or simple skill)
        try {
          const stat = await fs.stat(fullPath)
          const content = await fs.readFile(fullPath, "utf-8")
          const parsed = matter(content)
          results.push({
            name: entry.name.replace(/\.md$/, ""),
            scope: "global",
            path: fullPath,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: false,
          })
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results
}

async function collectSupportingFiles(
  baseDir: string,
  currentDir: string,
  results: SupportingFile[],
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)
    if (entry.isFile() && entry.name !== "SKILL.md") {
      const stat = await fs.stat(fullPath)
      results.push({ name: entry.name, relativePath, size: stat.size })
    } else if (entry.isDirectory()) {
      await collectSupportingFiles(baseDir, fullPath, results)
    }
  }
}

// ── settings.json 파싱 헬퍼 ──

export async function readSettingsJson(
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

export async function readClaudeAppJson(): Promise<Record<string, unknown>> {
  const claudeJsonPath = path.join(os.homedir(), ".claude.json")
  try {
    const content = await fs.readFile(claudeJsonPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function readProjectLocalSettings(
  projectPath?: string,
): Promise<Record<string, unknown>> {
  const basePath = getProjectConfigPath(projectPath)
  const localSettingsPath = path.join(basePath, "settings.local.json")
  try {
    const content = await fs.readFile(localSettingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Plugin 목록 ──

export async function getPlugins(projectPath?: string): Promise<Plugin[]> {
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

  // settings.json에서 enabledPlugins 읽기 (global + project 병합, project 우선)
  const [globalSettings, projectSettings] = await Promise.all([
    readSettingsJson(globalBase),
    projectPath
      ? readSettingsJson(getProjectConfigPath(projectPath))
      : Promise.resolve({} as Record<string, unknown>),
  ])
  function toEnabledMap(raw: unknown): Record<string, boolean> {
    if (Array.isArray(raw)) {
      return Object.fromEntries(
        raw
          .filter((id): id is string => typeof id === "string")
          .map((id) => [id, true]),
      )
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
        ),
      )
    }
    return {}
  }
  const enabledPlugins: Record<string, boolean> = {
    ...toEnabledMap(globalSettings.enabledPlugins),
    ...toEnabledMap(projectSettings.enabledPlugins),
  }

  function isEnabled(id: string): boolean {
    return enabledPlugins[id] === true
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
        const lastAtIdx = pluginId.lastIndexOf("@")
        const [name, marketplace] =
          lastAtIdx > 0
            ? [pluginId.slice(0, lastAtIdx), pluginId.slice(lastAtIdx + 1)]
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

  // 프로젝트 경로가 주어진 경우 project 스코프 플러그인을 해당 경로로 필터링
  const filteredPlugins = projectPath
    ? plugins.filter(
        (p) => p.scope !== "project" || p.projectPath === projectPath,
      )
    : plugins

  const enrichedPlugins = await Promise.all(
    filteredPlugins.map(async (plugin) => {
      if (!plugin.installPath) return plugin
      try {
        const [manifest, contents] = await Promise.all([
          readPluginManifest(plugin.installPath),
          scanPluginComponents(plugin.installPath),
        ])
        return {
          ...plugin,
          description: manifest?.description ?? plugin.description,
          author: manifest?.author,
          homepage: manifest?.homepage,
          repository: manifest?.repository,
          license: manifest?.license,
          keywords: manifest?.keywords,
          contents,
        }
      } catch {
        return plugin
      }
    }),
  )
  return enrichedPlugins
}

// ── Marketplace 목록 ──

interface Marketplace {
  name: string
  owner: { name: string; email?: string }
  metadata?: { description?: string; version?: string; pluginRoot?: string }
  plugins: unknown[]
  autoUpdate?: boolean
}

export async function getMarketplaces(): Promise<Marketplace[]> {
  const cachePath = path.join(getGlobalConfigPath(), "plugins", "cache")
  const marketplaces: Marketplace[] = []

  let entries: Dirent[]
  try {
    entries = await fs.readdir(cachePath, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const marketplacePath = path.join(cachePath, entry.name, "marketplace.json")
    try {
      const content = await fs.readFile(marketplacePath, "utf-8")
      const data = JSON.parse(content) as Marketplace
      marketplaces.push(data)
    } catch {
      // No marketplace.json or invalid — skip
    }
  }

  return marketplaces
}

// ── Plugin Manifest 읽기 ──

export async function readPluginManifest(installPath: string): Promise<{
  name?: string
  description?: string
  author?: PluginAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  version?: string
} | null> {
  const manifestPath = path.join(installPath, ".claude-plugin", "plugin.json")
  try {
    const content = await fs.readFile(manifestPath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

// ── Plugin Contents 스캔 ──

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

async function readHooksJson(filePath: string): Promise<HooksSettings> {
  const raw = await readJsonFile<Record<string, unknown>>(filePath, {})
  // hooks.json은 직접 형태({ PreToolUse: [...] })와 래퍼 형태({ hooks: { PreToolUse: [...] } }) 모두 지원
  const hooks = raw.hooks ?? raw
  return hooks as HooksSettings
}

async function readMcpJson(filePath: string): Promise<McpServer[]> {
  const raw = await readJsonFile<Record<string, unknown>>(filePath, {})
  const mcpServersRaw = raw.mcpServers ?? raw
  if (typeof mcpServersRaw !== "object" || mcpServersRaw === null) return []
  return parseMcpServers(mcpServersRaw as Record<string, unknown>, "global")
}

async function readLspJson(filePath: string): Promise<LspServer[]> {
  const raw = await readJsonFile<Record<string, unknown>>(filePath, {})
  const servers: LspServer[] = []
  for (const [name, config] of Object.entries(raw)) {
    if (typeof config !== "object" || config === null) continue
    const c = config as Record<string, unknown>
    servers.push({
      name,
      command: (c.command as string) ?? "",
      args: c.args as string[] | undefined,
      transport: c.transport as "stdio" | "socket" | undefined,
      extensionToLanguage:
        (c.extensionToLanguage as Record<string, string>) ?? {},
    })
  }
  return servers
}

export async function scanPluginComponents(
  installPath: string,
): Promise<PluginComponents> {
  const [
    commands,
    skills,
    agents,
    hooks,
    mcpServers,
    lspServers,
    outputStyles,
  ] = await Promise.all([
    scanMdDir(path.join(installPath, "commands"), "command").catch(() => []),
    scanSkillsDir(path.join(installPath, "skills")).catch(() => []),
    scanMdDir(path.join(installPath, "agents"), "agent").catch(() => []),
    readHooksJson(path.join(installPath, "hooks", "hooks.json")),
    readMcpJson(path.join(installPath, ".mcp.json")),
    readLspJson(path.join(installPath, ".lsp.json")),
    scanMdDir(path.join(installPath, "outputStyles"), "skill").catch(() => []),
  ])
  return {
    commands,
    skills,
    agents,
    hooks,
    mcpServers,
    lspServers,
    outputStyles,
  }
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
    getPlugins(projectPath),
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

// ── CLAUDE.md 재귀 탐색 (프로젝트 전체) ──

export interface ClaudeMdFile {
  relativePath: string // e.g., "src/CLAUDE.md"
  absolutePath: string
  size: number
  lastModified: string
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
  "__pycache__",
])

const MAX_SCAN_DEPTH = 5

export async function scanClaudeMdFiles(
  projectPath: string,
): Promise<ClaudeMdFile[]> {
  const results: ClaudeMdFile[] = []

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_SCAN_DEPTH) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "CLAUDE.md") {
        const fullPath = path.join(dir, entry.name)
        try {
          const stat = await fs.stat(fullPath)
          results.push({
            relativePath: path.relative(projectPath, fullPath),
            absolutePath: fullPath,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          })
        } catch {
          // skip unreadable files
        }
      } else if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), depth + 1)
      }
    }
  }

  await walk(projectPath, 0)
  return results
}

// ── 모든 AgentFile 반환 (타입별) ──

export async function getAgentFiles(
  type: AgentFile["type"],
  projectPath?: string,
): Promise<AgentFile[]> {
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  if (type === "skill") {
    // Use skills-aware scanner for directory-based skills
    const globalSkills = await scanSkillsDir(path.join(globalBase, "skills"))
    for (const f of globalSkills) f.scope = "global"

    // Also include legacy commands
    const globalCommands = await scanMdDir(
      path.join(globalBase, "commands"),
      "command",
    )
    for (const f of globalCommands) f.scope = "global"

    const projectSkills = await scanSkillsDir(path.join(projectBase, "skills"))
    for (const f of projectSkills) f.scope = "project"

    const projectCommands = await scanMdDir(
      path.join(projectBase, "commands"),
      "command",
    )
    for (const f of projectCommands) f.scope = "project"

    return [
      ...globalSkills,
      ...globalCommands,
      ...projectSkills,
      ...projectCommands,
    ]
  }

  const dirName = `${type}s` // 'agent' → 'agents', 'command' → 'commands'

  const [globalFiles, projectFiles] = await Promise.all([
    scanMdDirWithScope(path.join(globalBase, dirName), type, "global"),
    scanMdDirWithScope(path.join(projectBase, dirName), type, "project"),
  ])

  return [...globalFiles, ...projectFiles]
}

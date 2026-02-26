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
  const { getPlugins } = await import("@/services/plugin-service")
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

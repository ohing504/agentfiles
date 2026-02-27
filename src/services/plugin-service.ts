import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { scanMdDir, scanSkillsDir } from "@/services/agent-file-service"
import {
  getGlobalConfigPath,
  getProjectConfigPath,
  readSettingsJson,
} from "@/services/config-service"
import type {
  HooksSettings,
  LspServer,
  McpServer,
  Plugin,
  PluginAuthor,
  PluginComponents,
  Scope,
} from "@/shared/types"

// ── Plugin 목록 ──

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
  return parseMcpServers(mcpServersRaw as Record<string, unknown>, "user")
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

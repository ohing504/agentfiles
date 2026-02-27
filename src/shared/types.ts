import { z } from "zod"

// ── Zod 스키마 ──
export const scopeSchema = z.enum(["user", "project", "local", "managed"])
export const agentFileTypeSchema = z.enum(["agent", "command", "skill"])

// ── 스코프 ──
export type Scope = z.infer<typeof scopeSchema>

// ── CLAUDE.md File ID ──
export type ClaudeMdFileId =
  | { global: true }
  | { projectPath: string; relativePath: string }

// ── CLAUDE.md ──
export interface ClaudeMd {
  scope: Scope
  path: string
  content: string
  size: number
  lastModified: string // ISO 8601
}

// ── Plugin ──
export interface PluginAuthor {
  name: string
  email?: string
  url?: string
}

export interface LspServer {
  name: string
  command: string
  args?: string[]
  transport?: "stdio" | "socket"
  extensionToLanguage: Record<string, string>
}

export interface PluginComponents {
  commands: AgentFile[]
  skills: AgentFile[]
  agents: AgentFile[]
  hooks: HooksSettings
  mcpServers: McpServer[]
  lspServers: LspServer[]
  outputStyles: AgentFile[]
}

export interface Plugin {
  id: string // "superpowers@claude-plugins-official"
  name: string
  marketplace: string
  scope: Scope
  projectPath?: string
  version: string
  installedAt: string
  lastUpdated: string
  gitCommitSha: string
  installPath: string
  enabled: boolean
  description?: string
  author?: PluginAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  contents?: PluginComponents
}

// ── MCP Server ──
export interface McpServer {
  name: string
  scope: Scope
  type: "stdio" | "sse" | "streamable-http"
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  disabled?: boolean
  /** Config file path for "Open in Editor" */
  configPath?: string
  /** Plugin short name if provided by a plugin (read-only, cannot be edited/deleted) */
  fromPlugin?: string
  /** 동일 이름의 서버가 다른 소스(직접 추가 vs 플러그인)에도 존재할 때 true */
  isDuplicate?: boolean
}

// ── Agent / Command / Skill ──
export interface AgentFile {
  name: string
  scope: Scope
  path: string
  namespace?: string
  frontmatter?: {
    name?: string
    description?: string
    [key: string]: string | number | boolean | null | undefined
  }
  size: number
  lastModified: string // ISO 8601
  type: "agent" | "command" | "skill"
  isSymlink?: boolean
  symlinkTarget?: string
  isSkillDir?: boolean // true if .claude/skills/<name>/SKILL.md format
  supportingFiles?: SupportingFile[] // other files in the skill directory
}

export interface SupportingFile {
  name: string
  relativePath: string // relative to skill directory
  size: number
}

// ── 대시보드 ──
export interface Overview {
  claudeMd: { global?: ClaudeMd; project?: ClaudeMd }
  plugins: { total: number; user: number; project: number }
  mcpServers: { total: number; global: number; project: number }
  agents: { total: number; global: number; project: number }
  commands: { total: number; global: number; project: number }
  skills: { total: number; global: number; project: number }
  conflictCount: number
}

// ── API 에러 ──
export interface ApiError {
  error: string
  code?: string
}

// ── CLI 상태 ──
export interface CliStatus {
  available: boolean
  version?: string
  latestVersion?: string
  reason?: string
}

// ── Project ──
export interface Project {
  path: string
  name: string
  addedAt: string // ISO 8601
  hasClaudeDir?: boolean
}

export interface ProjectsConfig {
  projects: Project[]
  activeProject: string | null // project path or null for Global Only
}

// ── Settings ──
export interface GlobalSettings {
  model?: string
  alwaysThinkingEnabled?: boolean
  skipDangerousModePermissionPrompt?: boolean
  enableAllProjectMcpServers?: boolean
  env?: Record<string, string>
  statusLine?: {
    type?: string
    command?: string
  }
  enabledPlugins?: Record<string, boolean> | string[]
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProjectSettings {
  enabledPlugins?: Record<string, boolean> | string[]
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProjectLocalSettings {
  permissions?: {
    allow?: string[]
    deny?: string[]
  }
  [key: string]: unknown
}

export interface ClaudeAppJson {
  numStartups?: number
  installMethod?: string
  autoUpdates?: boolean
  cachedStatsigGates?: Record<string, boolean>
  [key: string]: unknown
}

// ── Hooks ──
export type HookScope = "user" | "project" | "local"

export type HookType = "command" | "prompt" | "agent"

export interface HookEntry {
  type: HookType
  command?: string
  prompt?: string
  model?: string
  timeout?: number
  async?: boolean
  statusMessage?: string
  once?: boolean
}

export interface HookMatcherGroup {
  matcher?: string
  hooks: HookEntry[]
}

export type HookEventName =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PermissionRequest"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Notification"
  | "SubagentStart"
  | "SubagentStop"
  | "Stop"
  | "TeammateIdle"
  | "TaskCompleted"
  | "ConfigChange"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "Setup"
  | "PreCompact"
  | "SessionEnd"

export type HooksSettings = Partial<Record<HookEventName, HookMatcherGroup[]>>

// ── MCP Connection Status ──
export type McpConnectionStatus =
  | "connected"
  | "needs_authentication"
  | "failed"
  | "disabled"
  | "unknown"

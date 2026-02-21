// ── 스코프 ──
export type Scope = "global" | "project"

// ── CLAUDE.md ──
export interface ClaudeMd {
  scope: Scope
  path: string
  content: string
  size: number
  lastModified: string // ISO 8601
}

// ── Plugin ──
export interface Plugin {
  id: string // "superpowers@claude-plugins-official"
  name: string
  marketplace: string
  scope: "user" | "project"
  projectPath?: string
  version: string
  installedAt: string
  lastUpdated: string
  gitCommitSha: string
  installPath: string
  enabled: boolean
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
    [key: string]: unknown
  }
  size: number
  lastModified: string // ISO 8601
  type: "agent" | "command" | "skill"
  isSymlink?: boolean
  symlinkTarget?: string
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

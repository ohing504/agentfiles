import type { AgentFile, Scope } from "@/shared/types"

/**
 * Query Key Factory — 모든 React Query 키를 중앙 관리
 *
 * 구조: generic → specific (prefix 매칭으로 계층적 invalidation 가능)
 * 참고: https://tkdodo.eu/blog/effective-react-query-keys
 */
export const queryKeys = {
  overview: {
    all: ["overview"] as const,
    byProject: (projectPath?: string) =>
      [...queryKeys.overview.all, projectPath] as const,
  },

  claudeMd: {
    all: ["claude-md"] as const,
    byScope: (scope: Scope, projectPath?: string) =>
      [...queryKeys.claudeMd.all, scope, projectPath] as const,
    file: (fileKey: string) =>
      [...queryKeys.claudeMd.all, "file", fileKey] as const,
  },

  claudeMdFiles: {
    all: ["claude-md-files"] as const,
    byProject: (projectPath?: string) =>
      [...queryKeys.claudeMdFiles.all, projectPath] as const,
  },

  mcpServers: {
    all: ["mcp-servers"] as const,
    byProject: (projectPath?: string) =>
      [...queryKeys.mcpServers.all, projectPath] as const,
  },

  agentFiles: {
    all: ["agent-files"] as const,
    byType: (type: AgentFile["type"]) =>
      [...queryKeys.agentFiles.all, type] as const,
    byTypeAndProject: (type: AgentFile["type"], projectPath?: string) =>
      [...queryKeys.agentFiles.all, type, projectPath] as const,
    detail: (path: string) =>
      [...queryKeys.agentFiles.all, "detail", path] as const,
    supportingFile: (skillPath: string, relativePath: string) =>
      [
        ...queryKeys.agentFiles.all,
        "supporting-file",
        skillPath,
        relativePath,
      ] as const,
  },

  cliStatus: {
    all: ["cli-status"] as const,
  },

  projects: {
    all: ["projects"] as const,
  },

  settings: {
    all: ["settings"] as const,
    byScope: (scope: Scope, projectPath?: string) =>
      [...queryKeys.settings.all, scope, projectPath] as const,
  },

  claudeAppJson: {
    all: ["claude-app-json"] as const,
  },

  projectLocalSettings: {
    all: ["project-local-settings"] as const,
    byProject: (projectPath?: string) =>
      [...queryKeys.projectLocalSettings.all, projectPath] as const,
  },
}

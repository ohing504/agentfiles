import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { queryKeys } from "@/lib/query-keys"
import type {
  AgentFile,
  ClaudeMdFileId,
  HookScope,
  Scope,
} from "@/shared/types"

export const FREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

const INFREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 30_000,
} as const

// ── Overview ──────────────────────────────────────────────────────────────────

export function useOverview() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.overview.byProject(activeProjectPath),
    queryFn: async () => {
      const { getOverview } = await import("@/server/overview")
      return getOverview({ data: { projectPath: activeProjectPath } })
    },
    ...FREQUENT_REFETCH,
  })
}

// ── CLAUDE.md ─────────────────────────────────────────────────────────────────

// ── CLAUDE.md File (file-level read/write) ───────────────────────────────────

function toFileKey(fileId: ClaudeMdFileId): string {
  return "global" in fileId
    ? "global"
    : `${fileId.projectPath}/${fileId.relativePath}`
}

export function useClaudeMdFile(fileId: ClaudeMdFileId) {
  const queryClient = useQueryClient()
  const fileKey = toFileKey(fileId)

  const query = useQuery({
    queryKey: queryKeys.claudeMd.file(fileKey),
    queryFn: async () => {
      const { readClaudeMdFileFn } = await import("@/server/claude-md")
      return readClaudeMdFileFn({
        data:
          "global" in fileId
            ? { global: true }
            : {
                projectPath: fileId.projectPath,
                relativePath: fileId.relativePath,
              },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const { saveClaudeMdFileFn } = await import("@/server/claude-md")
      return saveClaudeMdFileFn({
        data:
          "global" in fileId
            ? { global: true, content }
            : {
                projectPath: fileId.projectPath,
                relativePath: fileId.relativePath,
                content,
              },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.claudeMd.file(fileKey),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, mutation }
}

export function useClaudeMdGlobalMeta() {
  return useQuery({
    queryKey: queryKeys.claudeMd.file("global"),
    queryFn: async () => {
      const { readClaudeMdFileFn } = await import("@/server/claude-md")
      return readClaudeMdFileFn({ data: { global: true } })
    },
    select: (data) => data.size,
    ...FREQUENT_REFETCH,
  })
}

// ── Plugins ───────────────────────────────────────────────────────────────────

export function usePlugins() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: async () => {
      const { getPluginsFn } = await import("@/server/plugins")
      return getPluginsFn()
    },
    ...INFREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (params: { id: string; enable: boolean }) => {
      const { togglePluginFn } = await import("@/server/plugins")
      return togglePluginFn({ data: params })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, mutation }
}

// ── MCP Servers ───────────────────────────────────────────────────────────────

export function useMcpServers() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.mcpServers.byProject(activeProjectPath),
    queryFn: async () => {
      const { getMcpServersFn } = await import("@/server/mcp")
      return getMcpServersFn({ data: { projectPath: activeProjectPath } })
    },
    ...INFREQUENT_REFETCH,
  })

  const addMutation = useMutation({
    mutationFn: async (params: {
      name: string
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      scope: Scope
    }) => {
      const { addMcpServerFn } = await import("@/server/mcp")
      return addMcpServerFn({
        data: { ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (params: { name: string; scope: Scope }) => {
      const { removeMcpServerFn } = await import("@/server/mcp")
      return removeMcpServerFn({
        data: { ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, addMutation, removeMutation }
}

// ── Agent Files ───────────────────────────────────────────────────────────────

export function useAgentFiles(type: AgentFile["type"]) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.agentFiles.byTypeAndProject(type, activeProjectPath),
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({
        data: { type, projectPath: activeProjectPath },
      })
    },
    ...INFREQUENT_REFETCH,
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      name: string
      content: string
      scope: Scope
    }) => {
      const { saveItemFn } = await import("@/server/items")
      return saveItemFn({
        data: { type, ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentFiles.byType(type),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: { name: string; scope: Scope }) => {
      const { deleteItemFn } = await import("@/server/items")
      return deleteItemFn({
        data: { type, ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentFiles.byType(type),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, saveMutation, deleteMutation }
}

// ── CLI Status ────────────────────────────────────────────────────────────────

export function useCliStatus() {
  return useQuery({
    queryKey: queryKeys.cliStatus.all,
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  })
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function useSettings(scope: Scope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.settings.byScope(
      scope,
      scope === "project" ? activeProjectPath : undefined,
    ),
    queryFn: async () => {
      const { getSettingsFn } = await import("@/server/settings")
      return getSettingsFn({
        data: { scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { saveSettingsFn } = await import("@/server/settings")
      return saveSettingsFn({
        data: { scope, projectPath: activeProjectPath, settings },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.byScope(
          scope,
          scope === "project" ? activeProjectPath : undefined,
        ),
      })
    },
  })

  return { query, mutation }
}

// ── Claude App JSON (read-only) ──────────────────────────────────────────────

export function useClaudeAppJson() {
  return useQuery({
    queryKey: queryKeys.claudeAppJson.all,
    queryFn: async () => {
      const { getClaudeAppJsonFn } = await import("@/server/settings")
      return getClaudeAppJsonFn()
    },
    ...INFREQUENT_REFETCH,
  })
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useHooks(scope: HookScope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const needsProject = scope === "project" || scope === "local"

  const query = useQuery({
    queryKey: queryKeys.hooks.byScope(
      scope,
      needsProject ? activeProjectPath : undefined,
    ),
    queryFn: async () => {
      const { getHooksFn } = await import("@/server/hooks")
      return getHooksFn({
        data: { scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const addMutation = useMutation({
    mutationFn: async (params: {
      event: import("@/shared/types").HookEventName
      matcherGroup: import("@/shared/types").HookMatcherGroup
    }) => {
      const { addHookFn } = await import("@/server/hooks")
      return addHookFn({
        data: {
          scope,
          event: params.event,
          matcherGroup: params.matcherGroup,
          projectPath: activeProjectPath,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hooks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (params: {
      event: import("@/shared/types").HookEventName
      groupIndex: number
      hookIndex: number
    }) => {
      const { removeHookFn } = await import("@/server/hooks")
      return removeHookFn({
        data: {
          scope,
          event: params.event,
          groupIndex: params.groupIndex,
          hookIndex: params.hookIndex,
          projectPath: activeProjectPath,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hooks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, addMutation, removeMutation }
}

// ── Project Local Settings ───────────────────────────────────────────────────

export function useProjectLocalSettings() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.projectLocalSettings.byProject(activeProjectPath),
    queryFn: async () => {
      const { getProjectLocalSettingsFn } = await import("@/server/settings")
      return getProjectLocalSettingsFn({
        data: { projectPath: activeProjectPath },
      })
    },
    ...INFREQUENT_REFETCH,
  })
}

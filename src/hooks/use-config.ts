import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import type { AgentFile, Scope } from "@/shared/types"

const REFETCH_OPTIONS = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

// ── Overview ──────────────────────────────────────────────────────────────────

export function useOverview() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: ["overview", activeProjectPath],
    queryFn: async () => {
      const { getOverview } = await import("@/server/overview")
      return getOverview({ data: { projectPath: activeProjectPath } })
    },
    ...REFETCH_OPTIONS,
  })
}

// ── CLAUDE.md ─────────────────────────────────────────────────────────────────

export function useClaudeMd(scope: Scope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["claude-md", scope, activeProjectPath],
    queryFn: async () => {
      const { getClaudeMdFn } = await import("@/server/claude-md")
      return getClaudeMdFn({ data: { scope, projectPath: activeProjectPath } })
    },
    ...REFETCH_OPTIONS,
  })

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const { saveClaudeMdFn } = await import("@/server/claude-md")
      return saveClaudeMdFn({
        data: { scope, content, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["claude-md", scope, activeProjectPath],
      })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })

  return { query, mutation }
}

// ── Plugins ───────────────────────────────────────────────────────────────────

export function usePlugins() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["plugins"],
    queryFn: async () => {
      const { getPluginsFn } = await import("@/server/plugins")
      return getPluginsFn()
    },
    ...REFETCH_OPTIONS,
  })

  const mutation = useMutation({
    mutationFn: async (params: { id: string; enable: boolean }) => {
      const { togglePluginFn } = await import("@/server/plugins")
      return togglePluginFn({ data: params })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })

  return { query, mutation }
}

// ── MCP Servers ───────────────────────────────────────────────────────────────

export function useMcpServers() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["mcp-servers", activeProjectPath],
    queryFn: async () => {
      const { getMcpServersFn } = await import("@/server/mcp")
      return getMcpServersFn({ data: { projectPath: activeProjectPath } })
    },
    ...REFETCH_OPTIONS,
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
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
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
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })

  return { query, addMutation, removeMutation }
}

// ── Agent Files ───────────────────────────────────────────────────────────────

export function useAgentFiles(type: AgentFile["type"]) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["agent-files", type, activeProjectPath],
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({
        data: { type, projectPath: activeProjectPath },
      })
    },
    ...REFETCH_OPTIONS,
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
      queryClient.invalidateQueries({ queryKey: ["agent-files", type] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
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
      queryClient.invalidateQueries({ queryKey: ["agent-files", type] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })

  return { query, saveMutation, deleteMutation }
}

// ── CLI Status ────────────────────────────────────────────────────────────────

export function useCliStatus() {
  return useQuery({
    queryKey: ["cli-status"],
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    ...REFETCH_OPTIONS,
  })
}

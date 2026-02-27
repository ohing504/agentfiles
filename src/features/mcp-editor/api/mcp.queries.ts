import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { INFREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { McpConnectionStatus, Scope } from "@/shared/types"
import {
  addMcpServerFn,
  getMcpServersFn,
  getMcpStatusFn,
  removeMcpServerFn,
} from "./mcp.functions"

// Feature-local query keys
const mcpKeys = {
  all: ["mcp-servers"] as const,
  list: (projectPath?: string | null) =>
    [...mcpKeys.all, "list", projectPath] as const,
}

export function useMcpQuery() {
  const { activeProjectPath } = useProjectContext()
  return useQuery({
    queryKey: mcpKeys.list(activeProjectPath),
    queryFn: () =>
      getMcpServersFn({
        data: { projectPath: activeProjectPath ?? undefined },
      }),
    ...INFREQUENT_REFETCH,
  })
}

export function useMcpMutations() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: mcpKeys.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const addMutation = useMutation({
    mutationFn: (params: {
      name: string
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      scope: Scope
    }) =>
      addMcpServerFn({
        data: { ...params, projectPath: activeProjectPath ?? undefined },
      }),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (params: { name: string; scope: Scope }) =>
      removeMcpServerFn({
        data: { ...params, projectPath: activeProjectPath ?? undefined },
      }),
    onSuccess: invalidate,
  })

  return { addMutation, removeMutation }
}

const mcpStatusKeys = {
  all: ["mcp-status"] as const,
  byProject: (projectPath?: string | null) =>
    [...mcpStatusKeys.all, projectPath] as const,
}

export function useMcpStatusQuery() {
  const { activeProjectPath } = useProjectContext()
  // 60s interval instead of INFREQUENT_REFETCH (30s): `claude mcp list` spawns
  // subprocesses for each server health check, so polling less aggressively
  // reduces CLI overhead.
  return useQuery<Record<string, McpConnectionStatus>>({
    queryKey: mcpStatusKeys.byProject(activeProjectPath),
    queryFn: () =>
      getMcpStatusFn({
        data: { projectPath: activeProjectPath ?? undefined },
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

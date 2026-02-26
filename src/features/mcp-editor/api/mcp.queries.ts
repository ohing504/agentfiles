import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { INFREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { Scope } from "@/shared/types"
import {
  addMcpServerFn,
  getMcpServersFn,
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

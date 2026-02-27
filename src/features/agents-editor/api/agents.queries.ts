import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { Scope } from "@/shared/types"
import { createAgentFn } from "./agents.functions"

// ── Queries ──────────────────────────────────────────────────────────────────

export function useAgentsQuery() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.agentFiles.byTypeAndProject("agent", activeProjectPath),
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({
        data: { type: "agent", projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useAgentMutations() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.agentFiles.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const createMutation = useMutation({
    mutationFn: (params: {
      name: string
      scope: Scope
      description?: string
    }) =>
      createAgentFn({
        data: { ...params, projectPath: activeProjectPath ?? undefined },
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: { name: string; scope: Scope }) => {
      const { deleteItemFn } = await import("@/server/items")
      return deleteItemFn({
        data: {
          type: "agent" as const,
          ...params,
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    onSuccess: invalidate,
  })

  return { createMutation, deleteMutation }
}

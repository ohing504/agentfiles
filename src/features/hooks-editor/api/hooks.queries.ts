import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { queryKeys } from "@/lib/query-keys"
import type { HookScope } from "@/shared/types"

const FREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

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
      const { getHooksFn } = await import("./hooks.functions")
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
      const { addHookFn } = await import("./hooks.functions")
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
      const { removeHookFn } = await import("./hooks.functions")
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

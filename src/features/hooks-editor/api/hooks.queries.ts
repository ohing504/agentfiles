import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { HookEventName, HookMatcherGroup, HookScope } from "@/shared/types"
import {
  addHookFn,
  getHooksFn,
  readScriptFn,
  removeHookFn,
} from "./hooks.functions"

// ── Feature-local query keys ──

export const hookKeys = {
  all: ["hooks"] as const,
  byScope: (scope: HookScope, projectPath?: string) =>
    [...hookKeys.all, scope, projectPath] as const,
  script: (command: string, projectPath?: string) =>
    [...hookKeys.all, "script", command, projectPath] as const,
}

// ── Queries ──

export function useHooksQuery(scope: HookScope) {
  const { activeProjectPath } = useProjectContext()
  const needsProject = scope === "project" || scope === "local"

  return useQuery({
    queryKey: hookKeys.byScope(
      scope,
      needsProject ? activeProjectPath : undefined,
    ),
    queryFn: () =>
      getHooksFn({
        data: { scope, projectPath: activeProjectPath },
      }),
    ...FREQUENT_REFETCH,
  })
}

export function useHookScriptQuery(
  command: string | undefined,
  projectPath: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: hookKeys.script(command ?? "", projectPath ?? undefined),
    queryFn: () =>
      readScriptFn({
        data: {
          filePath: command ?? "",
          projectPath: projectPath ?? undefined,
        },
      }),
    enabled: enabled && !!command,
  })
}

// ── Mutations ──

export function useHooksMutations(scope: HookScope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: hookKeys.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const addMutation = useMutation({
    mutationFn: (params: {
      event: HookEventName
      matcherGroup: HookMatcherGroup
    }) =>
      addHookFn({
        data: {
          scope,
          event: params.event,
          matcherGroup: params.matcherGroup,
          projectPath: activeProjectPath,
        },
      }),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (params: {
      event: HookEventName
      groupIndex: number
      hookIndex: number
    }) =>
      removeHookFn({
        data: {
          scope,
          event: params.event,
          groupIndex: params.groupIndex,
          hookIndex: params.hookIndex,
          projectPath: activeProjectPath,
        },
      }),
    onSuccess: invalidate,
  })

  return { addMutation, removeMutation }
}

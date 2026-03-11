import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import type { ConfigScope } from "@/lib/config-constants"
import {
  deleteConfigSettingFn,
  getConfigSettingsFn,
  updateConfigSettingFn,
} from "@/server/config-settings"

// ── Feature-local query keys ──

export const configKeys = {
  all: ["config-settings"] as const,
  byScope: (scope: ConfigScope, projectPath?: string) =>
    [...configKeys.all, scope, projectPath] as const,
}

// ── Queries ──

export function useConfigQuery(scope: ConfigScope) {
  const { activeProjectPath } = useProjectContext()
  const needsProject = scope === "project" || scope === "local"

  return useQuery({
    queryKey: configKeys.byScope(
      scope,
      needsProject ? activeProjectPath : undefined,
    ),
    queryFn: () =>
      getConfigSettingsFn({
        data: { scope, projectPath: activeProjectPath },
      }),
    ...FREQUENT_REFETCH,
  })
}

// ── Mutations ──

export function useConfigMutations(scope: ConfigScope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()
  const needsProject = scope === "project" || scope === "local"

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: configKeys.byScope(
        scope,
        needsProject ? activeProjectPath : undefined,
      ),
    })

  const updateMutation = useMutation({
    mutationFn: (params: { key: string; value: unknown }) =>
      updateConfigSettingFn({
        data: {
          scope,
          key: params.key,
          value: params.value,
          projectPath: activeProjectPath,
        },
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) =>
      deleteConfigSettingFn({
        data: { scope, key, projectPath: activeProjectPath },
      }),
    onSuccess: invalidate,
  })

  return { updateMutation, deleteMutation }
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import {
  getPluginsFn,
  togglePluginFn,
  uninstallPluginFn,
  updatePluginFn,
} from "@/server/plugins-fns"
import type { Scope } from "@/shared/types"

const pluginKeys = {
  all: ["plugins"] as const,
  list: (projectPath?: string) =>
    [...pluginKeys.all, "list", projectPath] as const,
}

export function usePluginsQuery(projectPath?: string) {
  return useQuery({
    queryKey: pluginKeys.list(projectPath),
    queryFn: () => getPluginsFn({ data: { projectPath } }),
    ...FREQUENT_REFETCH,
  })
}

export function usePluginMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: pluginKeys.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const toggleMutation = useMutation({
    mutationFn: (params: {
      id: string
      enable: boolean
      scope?: Scope
      projectPath?: string
    }) => togglePluginFn({ data: params }),
    onSuccess: invalidate,
  })

  const uninstallMutation = useMutation({
    mutationFn: (params: { id: string; scope?: Scope; projectPath?: string }) =>
      uninstallPluginFn({ data: params }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string }) => updatePluginFn({ data: params }),
    onSuccess: invalidate,
  })

  return { toggleMutation, uninstallMutation, updateMutation }
}

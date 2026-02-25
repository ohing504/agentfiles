import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { PluginScope } from "@/shared/types"
import {
  getPluginsFn,
  togglePluginFn,
  uninstallPluginFn,
  updatePluginFn,
} from "./plugins.functions"

const pluginKeys = {
  all: ["plugins"] as const,
  list: (projectPath?: string) =>
    [...pluginKeys.all, "list", projectPath] as const,
  contents: (installPath: string) =>
    [...pluginKeys.all, "contents", installPath] as const,
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
      scope?: PluginScope
    }) => togglePluginFn({ data: params }),
    onSuccess: invalidate,
  })

  const uninstallMutation = useMutation({
    mutationFn: (params: { id: string; scope?: PluginScope }) =>
      uninstallPluginFn({ data: params }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string }) => updatePluginFn({ data: params }),
    onSuccess: invalidate,
  })

  return { toggleMutation, uninstallMutation, updateMutation }
}

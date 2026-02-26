import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

export function useProjects() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const { getProjectsFn } = await import("@/server/projects")
      return getProjectsFn()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const { addProjectFn } = await import("@/server/projects")
      return addProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const { removeProjectFn } = await import("@/server/projects")
      return removeProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async (projectPath: string | null) => {
      const { setActiveProjectFn } = await import("@/server/projects")
      return setActiveProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.claudeMd.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.agentFiles.all })
    },
  })

  return { query, addMutation, removeMutation, setActiveMutation }
}

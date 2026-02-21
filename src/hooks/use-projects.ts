import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export function useProjects() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["projects"],
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
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const { removeProjectFn } = await import("@/server/projects")
      return removeProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async (projectPath: string | null) => {
      const { setActiveProjectFn } = await import("@/server/projects")
      return setActiveProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
      queryClient.invalidateQueries({ queryKey: ["claude-md"] })
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] })
      queryClient.invalidateQueries({ queryKey: ["agent-files"] })
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
    },
  })

  return { query, addMutation, removeMutation, setActiveMutation }
}

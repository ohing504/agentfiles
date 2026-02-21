import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"

export function useClaudeMdFiles() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: ["claude-md-files", activeProjectPath],
    queryFn: async () => {
      if (!activeProjectPath) return []
      const { scanClaudeMdFilesFn } = await import("@/server/projects")
      return scanClaudeMdFilesFn({ data: { projectPath: activeProjectPath } })
    },
    enabled: !!activeProjectPath,
  })
}

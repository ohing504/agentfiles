import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { queryKeys } from "@/lib/query-keys"

export function useClaudeMdFiles() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.claudeMdFiles.byProject(activeProjectPath),
    queryFn: async () => {
      if (!activeProjectPath) return []
      const { scanClaudeMdFilesFn } = await import("@/server/projects")
      return scanClaudeMdFilesFn({ data: { projectPath: activeProjectPath } })
    },
    enabled: !!activeProjectPath,
  })
}

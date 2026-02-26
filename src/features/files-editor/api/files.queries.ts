import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { INFREQUENT_REFETCH } from "@/hooks/use-config"
import type { FilesScope } from "../constants"
import { getFileContentFn, getFileTreeFn } from "./files.functions"

// ── Feature-local query keys ──

export const fileKeys = {
  all: ["files-explorer"] as const,
  tree: (scope: FilesScope, projectPath?: string) =>
    [...fileKeys.all, "tree", scope, projectPath] as const,
  content: (filePath: string) =>
    [...fileKeys.all, "content", filePath] as const,
}

// ── Queries ──

export function useFileTreeQuery(scope: FilesScope) {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: fileKeys.tree(
      scope,
      scope === "project" ? activeProjectPath : undefined,
    ),
    queryFn: () =>
      getFileTreeFn({
        data: {
          scope,
          projectPath: activeProjectPath,
        },
      }),
    ...INFREQUENT_REFETCH,
  })
}

export function useFileContentQuery(filePath: string | null) {
  return useQuery({
    queryKey: fileKeys.content(filePath ?? ""),
    queryFn: () => getFileContentFn({ data: { filePath: filePath ?? "" } }),
    enabled: !!filePath,
    ...INFREQUENT_REFETCH,
  })
}

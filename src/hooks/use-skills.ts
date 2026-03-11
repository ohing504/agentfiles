import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import {
  createSkillFn,
  readSupportingFileFn,
  saveFrontmatterFn,
} from "@/server/skills"
import type { Scope } from "@/shared/types"

// ── Queries ──────────────────────────────────────────────────────────────────

export function useSkillsQuery() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.agentFiles.byTypeAndProject("skill", activeProjectPath),
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({
        data: { type: "skill", projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })
}

export function useSupportingFileQuery(
  skillPath: string | undefined,
  relativePath: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.agentFiles.supportingFile(
      skillPath ?? "",
      relativePath ?? "",
    ),
    queryFn: () =>
      readSupportingFileFn({
        data: { skillPath: skillPath ?? "", relativePath: relativePath ?? "" },
      }),
    enabled: !!skillPath && !!relativePath,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useSkillMutations() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.agentFiles.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const createMutation = useMutation({
    mutationFn: (params: {
      name: string
      scope: Scope
      description?: string
    }) =>
      createSkillFn({
        data: { ...params, projectPath: activeProjectPath ?? undefined },
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: {
      name: string
      scope: Scope
      agent?: string
    }) => {
      const { deleteItemFn } = await import("@/server/items")
      return deleteItemFn({
        data: {
          type: "skill" as const,
          ...params,
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    onSuccess: invalidate,
  })

  const saveFrontmatterMutation = useMutation({
    mutationFn: (params: {
      filePath: string
      frontmatter: Record<string, unknown>
    }) => saveFrontmatterFn({ data: params }),
    onSuccess: invalidate,
  })

  return { createMutation, deleteMutation, saveFrontmatterMutation }
}

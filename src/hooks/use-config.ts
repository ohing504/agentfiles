import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { queryKeys } from "@/lib/query-keys"
import type { AgentFile, ClaudeMdFileId, Scope } from "@/shared/types"

export const FREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

export const INFREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 30_000,
} as const

// ── Overview ──────────────────────────────────────────────────────────────────

export function useOverview() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.overview.byProject(activeProjectPath),
    queryFn: async () => {
      const { getOverview } = await import("@/server/overview")
      return getOverview({ data: { projectPath: activeProjectPath } })
    },
    ...FREQUENT_REFETCH,
  })
}

// ── CLAUDE.md ─────────────────────────────────────────────────────────────────

// ── CLAUDE.md File (file-level read/write) ───────────────────────────────────

function toFileKey(fileId: ClaudeMdFileId): string {
  return "global" in fileId
    ? "user"
    : `${fileId.projectPath}/${fileId.relativePath}`
}

export function useClaudeMdFile(fileId: ClaudeMdFileId) {
  const queryClient = useQueryClient()
  const fileKey = toFileKey(fileId)

  const query = useQuery({
    queryKey: queryKeys.claudeMd.file(fileKey),
    queryFn: async () => {
      const { readClaudeMdFileFn } = await import("@/server/claude-md")
      return readClaudeMdFileFn({
        data:
          "global" in fileId
            ? { global: true }
            : {
                projectPath: fileId.projectPath,
                relativePath: fileId.relativePath,
              },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const { saveClaudeMdFileFn } = await import("@/server/claude-md")
      return saveClaudeMdFileFn({
        data:
          "global" in fileId
            ? { global: true, content }
            : {
                projectPath: fileId.projectPath,
                relativePath: fileId.relativePath,
                content,
              },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.claudeMd.file(fileKey),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, mutation }
}

export function useClaudeMdGlobalMeta() {
  return useQuery({
    queryKey: queryKeys.claudeMd.file("user"),
    queryFn: async () => {
      const { readClaudeMdFileFn } = await import("@/server/claude-md")
      return readClaudeMdFileFn({ data: { global: true } })
    },
    select: (data) => data.size,
    ...FREQUENT_REFETCH,
  })
}

// ── Agent Files ───────────────────────────────────────────────────────────────

export function useAgentFiles(type: AgentFile["type"]) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.agentFiles.byTypeAndProject(type, activeProjectPath),
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({
        data: { type, projectPath: activeProjectPath },
      })
    },
    ...INFREQUENT_REFETCH,
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      name: string
      content: string
      scope: Scope
    }) => {
      const { saveItemFn } = await import("@/server/items")
      return saveItemFn({
        data: { type, ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentFiles.byType(type),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: { name: string; scope: Scope }) => {
      const { deleteItemFn } = await import("@/server/items")
      return deleteItemFn({
        data: { type, ...params, projectPath: activeProjectPath },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentFiles.byType(type),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, saveMutation, deleteMutation }
}

// ── CLI Status ────────────────────────────────────────────────────────────────

export function useCliStatus() {
  return useQuery({
    queryKey: queryKeys.cliStatus.all,
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  })
}

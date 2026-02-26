import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import type { AgentFile } from "@/shared/types"

/**
 * AgentFile 상세 내용을 조회하는 공유 훅.
 * skill, command, agent 타입 모두 지원한다.
 * file.path로 직접 파일을 읽으므로 모든 scope(global, project, managed, local)에서 동작한다.
 */
export function useAgentFileDetailQuery(
  file: Pick<AgentFile, "type" | "name" | "scope" | "path"> | null,
) {
  return useQuery({
    queryKey: queryKeys.agentFiles.detail(file?.path ?? ""),
    queryFn: async () => {
      if (!file) return null
      const { readFileContentFn } = await import("@/server/items")
      const { content } = await readFileContentFn({
        data: { filePath: file.path },
      })
      return {
        name: file.name,
        scope: file.scope,
        type: file.type,
        path: file.path,
        content,
      }
    },
    enabled: !!file,
  })
}

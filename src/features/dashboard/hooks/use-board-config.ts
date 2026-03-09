import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { BoardColumnId, BoardConfig } from "@/shared/types"

export function useBoardConfig() {
  const queryClient = useQueryClient()

  const { data: boardConfig } = useQuery({
    queryKey: ["boardConfig"],
    queryFn: async () => {
      const { getBoardConfigFn } = await import("@/server/agent-config")
      return getBoardConfigFn()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<BoardConfig>) => {
      const { updateBoardConfigFn } = await import("@/server/agent-config")
      return updateBoardConfigFn({ data: partial })
    },
    onMutate: async (partial) => {
      await queryClient.cancelQueries({ queryKey: ["boardConfig"] })
      const previous = queryClient.getQueryData<BoardConfig>(["boardConfig"])
      if (previous) {
        queryClient.setQueryData<BoardConfig>(["boardConfig"], {
          ...previous,
          ...partial,
        })
      }
      return { previous }
    },
    onError: (_err, _partial, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["boardConfig"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boardConfig"] })
    },
  })

  const toggleColumn = (id: BoardColumnId) => {
    if (!boardConfig) return
    const hidden = boardConfig.hiddenColumns.includes(id)
      ? boardConfig.hiddenColumns.filter((c) => c !== id)
      : [...boardConfig.hiddenColumns, id]
    updateMutation.mutate({ hiddenColumns: hidden })
  }

  const setColumnOrder = (order: BoardColumnId[]) => {
    updateMutation.mutate({ columnOrder: order })
  }

  return { boardConfig, toggleColumn, setColumnOrder }
}

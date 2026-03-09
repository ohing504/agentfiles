import { useQuery } from "@tanstack/react-query"
import { FileIcon, Loader2Icon } from "lucide-react"
import { useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { getFileTreeFn } from "@/features/files-editor/api/files.functions"
import { FileTreeNode } from "@/features/files-editor/components/FileTree"
import { m } from "@/paraglide/messages"
import type { DashboardDetailTarget } from "../types"

interface FilesPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function FilesPanel({ scopeFilter, onSelectItem }: FilesPanelProps) {
  const scope = (scopeFilter ?? "user") as "user" | "project"
  const { activeProjectPath } = useProjectContext()

  const { data: tree, isLoading } = useQuery({
    queryKey: ["files-explorer", "tree", scope, activeProjectPath],
    queryFn: () =>
      getFileTreeFn({
        data: {
          scope,
          projectPath: activeProjectPath ?? undefined,
        },
      }),
  })
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  function handleSelect(filePath: string) {
    setSelectedPath(filePath)
    onSelectItem?.({
      type: "file",
      filePath,
    })
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </div>
    )

  const children = tree?.children ?? []

  if (children.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <FileIcon />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_files()}</EmptyDescription>
      </Empty>
    )

  return (
    <ul className="list-none p-0 m-0">
      {children.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  )
}

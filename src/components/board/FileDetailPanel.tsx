import { toast } from "sonner"
import { FileViewer } from "@/components/FileViewer"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useFileContentQuery } from "@/hooks/use-files"
import { m } from "@/paraglide/messages"
import { DetailPanelHeader } from "./DetailPanelHeader"

interface FileDetailPanelProps {
  filePath: string
}

export function FileDetailPanel({ filePath }: FileDetailPanelProps) {
  const { data, isLoading } = useFileContentQuery(filePath)
  const fileName = filePath.split("/").pop() ?? filePath
  const isMarkdown = fileName.endsWith(".md")

  async function handleOpenInEditor(editor: "code" | "cursor") {
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  const editDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          {m.action_edit()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
          <VscodeIcon className="size-4" />
          {m.common_open_vscode()}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
          <CursorIcon className="size-4" />
          {m.common_open_cursor()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DetailPanelHeader title={fileName} trailing={editDropdown} />
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data ? (
          <FileViewer
            rawContent={data.content}
            fileName={fileName}
            isMarkdown={isMarkdown}
          />
        ) : null}
      </div>
    </div>
  )
}

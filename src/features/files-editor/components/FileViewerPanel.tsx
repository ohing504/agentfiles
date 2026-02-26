import { ExternalLinkIcon, FolderOpenIcon } from "lucide-react"
import { toast } from "sonner"
import { FileViewer } from "@/components/FileViewer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useFileContentQuery } from "../api/files.queries"

interface FileViewerPanelProps {
  filePath: string | null
}

export function FileViewerPanel({ filePath }: FileViewerPanelProps) {
  const { data, isLoading } = useFileContentQuery(filePath)

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-1">
          <FolderOpenIcon className="size-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            {m.files_no_selection()}
          </p>
          <p className="text-xs text-muted-foreground">
            {m.files_no_selection_desc()}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  const fileName = filePath.split("/").pop() ?? ""
  const isMarkdown = fileName.endsWith(".md")

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {fileName}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <ExternalLinkIcon className="size-3" />
              Open in...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              {m.files_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              {m.files_open_cursor()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content viewer */}
      <div className="flex-1 overflow-y-auto p-4">
        {data && (
          <FileViewer
            rawContent={data.content}
            fileName={fileName}
            isMarkdown={isMarkdown}
          />
        )}
      </div>
    </div>
  )
}

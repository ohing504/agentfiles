import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { m } from "@/paraglide/messages"
import type { McpServer } from "@/shared/types"
import { McpDetailView } from "./McpDetailView"

interface McpDetailPanelProps {
  server: McpServer
  /** Resolved config file path — enables "Open in Editor" */
  filePath?: string
  /** When provided, shows "Edit" menu item */
  onEdit?: () => void
  /** When provided, shows "Delete" menu item with confirmation */
  onDelete?: () => void
}

export function McpDetailPanel({
  server,
  filePath,
  onEdit,
  onDelete,
}: McpDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasAnyAction = !!filePath || !!onEdit || !!onDelete

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(m.mcp_open_error({ editor }))
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {server.name}
        </h2>
        {hasAnyAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 size-8">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filePath && (
                <>
                  <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
                    <VscodeIcon className="size-4" />
                    {m.mcp_open_vscode()}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenInEditor("cursor")}
                  >
                    <CursorIcon className="size-4" />
                    {m.mcp_open_cursor()}
                  </DropdownMenuItem>
                </>
              )}
              {onEdit && (
                <>
                  {filePath && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onEdit}>
                    <PencilIcon className="size-4" />
                    {m.action_edit()}
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2Icon className="size-4" />
                    {m.action_delete()}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <McpDetailView server={server} />

      {/* Delete confirmation */}
      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.mcp_delete_title()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.mcp_delete_confirm({ name: server.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.hooks_cancel()}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
              >
                {m.action_delete()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

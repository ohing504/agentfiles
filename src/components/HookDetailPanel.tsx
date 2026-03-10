import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
import { DetailPanelHeader } from "@/features/dashboard/components/DetailPanelHeader"
import { m } from "@/paraglide/messages"
import type { HookEntry } from "@/shared/types"
import { HookDetailView } from "./HookDetailView"

interface HookDetailPanelProps {
  hook: HookEntry
  event: string
  matcher?: string
  /** Resolved file path — enables "Open in Editor" */
  filePath?: string
  /** For script preview resolution */
  activeProjectPath?: string | null
  /** When provided, shows "Edit" menu item */
  onEdit?: () => void
  /** When provided, shows "Delete" menu item with confirmation */
  onDelete?: () => void
}

export function HookDetailPanel({
  hook,
  event,
  matcher,
  filePath,
  activeProjectPath,
  onEdit,
  onDelete,
}: HookDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasAnyAction = !!filePath || !!onEdit || !!onDelete

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(m.common_open_error({ editor }))
    }
  }

  return (
    <>
      <DetailPanelHeader
        title={event}
        trailing={
          hasAnyAction ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0">
                  <MoreHorizontal data-icon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {filePath && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleOpenInEditor("code")}
                    >
                      <VscodeIcon className="size-4" />
                      {m.common_open_vscode()}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleOpenInEditor("cursor")}
                    >
                      <CursorIcon className="size-4" />
                      {m.common_open_cursor()}
                    </DropdownMenuItem>
                  </>
                )}
                {onEdit && (
                  <>
                    {filePath && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="size-4" />
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
                      <Trash2 className="size-4" />
                      {m.action_delete()}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <HookDetailView
          hook={hook}
          event={event}
          matcher={matcher}
          resolvedFilePath={filePath}
          activeProjectPath={activeProjectPath}
        />
      </div>

      {/* Delete confirmation */}
      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.hooks_delete_title()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.hooks_delete_confirm()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
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

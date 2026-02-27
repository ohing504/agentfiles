import { FolderOpen, Pencil, Trash2 } from "lucide-react"
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { m } from "@/paraglide/messages"

interface ItemContextMenuProps {
  children: React.ReactNode
  filePath?: string
  isDir?: boolean
  onEdit?: () => void
  onDelete?: () => void
  deleteTitle?: string
  deleteDescription?: string
}

export function ItemContextMenu({
  children,
  filePath,
  isDir,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
}: ItemContextMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasAnyAction = !!filePath || !!onEdit || !!onDelete
  if (!hasAnyAction) return <>{children}</>

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(m.common_open_error({ editor }))
    }
  }

  async function handleOpenFolder() {
    if (!filePath) return
    try {
      const { openFolderFn } = await import("@/server/editor")
      const dirPath = filePath.replace(/\/SKILL\.md$/, "")
      await openFolderFn({ data: { dirPath } })
    } catch {
      toast.error("Failed to open folder")
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {filePath && (
            <>
              <ContextMenuItem onClick={() => handleOpenInEditor("code")}>
                <VscodeIcon className="size-4" />
                {m.common_open_vscode()}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleOpenInEditor("cursor")}>
                <CursorIcon className="size-4" />
                {m.common_open_cursor()}
              </ContextMenuItem>
              {isDir && (
                <ContextMenuItem onClick={handleOpenFolder}>
                  <FolderOpen className="size-4" />
                  {m.skills_open_folder()}
                </ContextMenuItem>
              )}
            </>
          )}
          {onEdit && (
            <>
              {filePath && <ContextMenuSeparator />}
              <ContextMenuItem onClick={onEdit}>
                <Pencil className="size-4" />
                {m.action_edit()}
              </ContextMenuItem>
            </>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="size-4" />
                {m.action_delete()}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTitle ?? m.action_delete()}
              </AlertDialogTitle>
              {deleteDescription && (
                <AlertDialogDescription>
                  {deleteDescription}
                </AlertDialogDescription>
              )}
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

/** ListSubItem(li 내부) 전용 ContextMenu - li 시맨틱을 보존 */
export function SubItemContextMenu({
  children,
  filePath,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
}: Omit<ItemContextMenuProps, "isDir">) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasAnyAction = !!filePath || !!onEdit || !!onDelete
  if (!hasAnyAction) return <>{children}</>

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
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          {filePath && (
            <>
              <ContextMenuItem onClick={() => handleOpenInEditor("code")}>
                <VscodeIcon className="size-4" />
                {m.common_open_vscode()}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleOpenInEditor("cursor")}>
                <CursorIcon className="size-4" />
                {m.common_open_cursor()}
              </ContextMenuItem>
            </>
          )}
          {onEdit && (
            <>
              {filePath && <ContextMenuSeparator />}
              <ContextMenuItem onClick={onEdit}>
                <Pencil className="size-4" />
                {m.action_edit()}
              </ContextMenuItem>
            </>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="size-4" />
                {m.action_delete()}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTitle ?? m.action_delete()}
              </AlertDialogTitle>
              {deleteDescription && (
                <AlertDialogDescription>
                  {deleteDescription}
                </AlertDialogDescription>
              )}
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

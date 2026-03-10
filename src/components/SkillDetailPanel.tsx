import { FolderOpen, MoreHorizontal, Trash2 } from "lucide-react"
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
import type { AgentFile } from "@/shared/types"
import { SkillDetailView } from "./SkillDetailView"

interface SkillDetailPanelProps {
  skill: AgentFile
  /** When provided, shows "Delete" menu item with confirmation */
  onDelete?: () => void
}

export function SkillDetailPanel({ skill, onDelete }: SkillDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasPath = !!skill.path
  const hasAnyAction = hasPath || !!onDelete

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!skill.path) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath: skill.path, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  async function handleOpenFolder() {
    try {
      const { openFolderFn } = await import("@/server/editor")
      const dirPath = skill.path.replace(/\/SKILL\.md$/, "")
      await openFolderFn({ data: { dirPath } })
    } catch {
      toast.error("Failed to open folder")
    }
  }

  return (
    <>
      <DetailPanelHeader
        title={skill.name}
        trailing={
          hasAnyAction ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0">
                  <MoreHorizontal data-icon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasPath && (
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
                    {skill.isSkillDir && (
                      <DropdownMenuItem onClick={handleOpenFolder}>
                        <FolderOpen className="size-4" />
                        {m.skills_open_folder()}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {onDelete && (
                  <>
                    {hasPath && <DropdownMenuSeparator />}
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
      <SkillDetailView skill={skill} />

      {/* Delete confirmation */}
      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.skills_delete_title()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.skills_delete_confirm({ name: skill.name })}
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

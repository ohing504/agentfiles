import { FolderOpen, Trash2 } from "lucide-react"
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
import type { AgentFile } from "@/shared/types"
import { useSkillMutations } from "../api/skills.queries"

interface SkillActionBarProps {
  skill: AgentFile
  onDeleted?: () => void
}

export function SkillActionBar({ skill, onDeleted }: SkillActionBarProps) {
  const { deleteMutation } = useSkillMutations()
  const [pendingDelete, setPendingDelete] = useState(false)

  async function handleOpenInEditor(editor: "code" | "cursor") {
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
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">{skill.name}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              {m.skills_edit()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              <VscodeIcon className="size-4" />
              {m.skills_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              <CursorIcon className="size-4" />
              {m.skills_open_cursor()}
            </DropdownMenuItem>
            {skill.isSkillDir && (
              <DropdownMenuItem onClick={handleOpenFolder}>
                <FolderOpen className="size-4" />
                {m.skills_open_folder()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(true)}
            >
              <Trash2 className="size-4" />
              {m.skills_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.skills_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.skills_delete_confirm({ name: skill.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(
                  { name: skill.name, scope: skill.scope },
                  {
                    onSuccess: () => {
                      setPendingDelete(false)
                      onDeleted?.()
                    },
                    onError: (e) => {
                      setPendingDelete(false)
                      toast.error(e.message || "Failed to delete skill")
                    },
                  },
                )
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

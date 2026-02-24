import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FolderOpen } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { FileViewer } from "@/components/FileViewer"
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
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import type { AgentFile } from "@/shared/types"
import { extractBody, FrontmatterBadges } from "../constants"

export function SkillDetailPanel({
  skill,
  activeProjectPath,
  onDeleted,
}: {
  skill: AgentFile
  activeProjectPath: string | null | undefined
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState(false)

  // Load full content
  const { data: itemDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["skill-detail", skill.path],
    queryFn: async () => {
      if (!skill) return null
      const { getItemFn } = await import("@/server/items")
      return getItemFn({
        data: {
          type: skill.type,
          name: skill.name,
          scope: skill.scope,
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    enabled: !!skill,
  })

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  async function handleOpenInEditor(editor: "code" | "cursor") {
    try {
      const { openInEditorFn } = await import("../api/skills.functions")
      await openInEditorFn({ data: { filePath: skill.path, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  async function handleOpenFolder() {
    try {
      const { openFolderFn } = await import("../api/skills.functions")
      const dirPath = skill.path.replace(/\/SKILL\.md$/, "")
      await openFolderFn({ data: { dirPath } })
    } catch {
      toast.error("Failed to open folder")
    }
  }

  async function handleDelete() {
    try {
      const { deleteItemFn } = await import("@/server/items")
      await deleteItemFn({
        data: {
          type: skill.type,
          name: skill.name,
          scope: skill.scope,
          projectPath: activeProjectPath ?? undefined,
        },
      })
      toast.success("Skill deleted")
      await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
      onDeleted()
    } catch {
      toast.error("Failed to delete skill")
    }
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
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
              {m.skills_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0">
        {/* Meta info */}
        <section className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {m.skills_scope()}
              </dt>
              <dd className="text-sm font-medium capitalize">{skill.scope}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {m.skills_last_updated()}
              </dt>
              <dd className="text-sm font-medium">
                {formatDate(skill.lastModified, getLocale())}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">
              {m.skills_description()}
            </dt>
            <dd className="text-sm text-foreground">
              {skill.frontmatter?.description ? (
                String(skill.frontmatter.description)
              ) : (
                <span className="italic text-muted-foreground">
                  No description
                </span>
              )}
            </dd>
          </div>
        </section>

        <Separator />

        {/* Markdown card */}
        <FileViewer
          content={body}
          rawContent={itemDetail?.content ?? ""}
          fileName="SKILL.md"
          isLoading={detailLoading}
          header={<FrontmatterBadges frontmatter={skill.frontmatter} />}
          className="flex-1"
        />
      </div>

      {/* Delete Confirmation Dialog */}
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
                setPendingDelete(false)
                handleDelete()
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

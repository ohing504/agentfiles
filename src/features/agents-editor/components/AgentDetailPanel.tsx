import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { DetailField } from "@/components/DetailField"
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
import { DetailPanelHeader } from "@/features/dashboard/components/DetailPanelHeader"
import { useAgentFileDetailQuery } from "@/hooks/use-agent-file-detail"
import { extractBody, formatDate } from "@/lib/format"
import { getLocale } from "@/paraglide/runtime"
import type { AgentFile } from "@/shared/types"

interface AgentDetailPanelProps {
  agent: AgentFile
  onDelete?: () => void
}

export function AgentDetailPanel({ agent, onDelete }: AgentDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data: itemDetail, isLoading: detailLoading } =
    useAgentFileDetailQuery(agent)

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""
  const hasPath = !!agent.path
  const hasAnyAction = hasPath || !!onDelete

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!agent.path) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath: agent.path, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  return (
    <>
      <DetailPanelHeader
        title={agent.name}
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
                      Open in VS Code
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleOpenInEditor("cursor")}
                    >
                      <CursorIcon className="size-4" />
                      Open in Cursor
                    </DropdownMenuItem>
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
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0">
        <section className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailField label="Scope">
              <span className="text-sm font-medium capitalize">
                {agent.scope}
              </span>
            </DetailField>
            <DetailField label="Last Updated">
              <span className="text-sm font-medium">
                {formatDate(agent.lastModified, getLocale())}
              </span>
            </DetailField>
          </dl>

          <DetailField label="Description">
            <span className="text-sm text-foreground">
              {agent.frontmatter?.description ? (
                String(agent.frontmatter.description)
              ) : (
                <span className="italic text-muted-foreground">
                  No description
                </span>
              )}
            </span>
          </DetailField>

          {agent.frontmatter?.model && (
            <DetailField label="Model">
              <span className="text-sm font-medium">
                {String(agent.frontmatter.model)}
              </span>
            </DetailField>
          )}

          {agent.frontmatter?.tools && (
            <DetailField label="Tools">
              <span className="text-sm font-medium">
                {String(agent.frontmatter.tools)}
              </span>
            </DetailField>
          )}

          {agent.frontmatter?.permissionMode && (
            <DetailField label="Permission Mode">
              <span className="text-sm font-medium">
                {String(agent.frontmatter.permissionMode)}
              </span>
            </DetailField>
          )}
        </section>

        <Separator />

        <FileViewer
          content={body}
          rawContent={itemDetail?.content ?? ""}
          fileName={`${agent.name}.md`}
          isLoading={detailLoading}
          className="flex-1"
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
              <AlertDialogTitle>Delete Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{agent.name}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

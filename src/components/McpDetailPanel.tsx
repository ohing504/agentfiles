import { MoreHorizontalIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
  useMcpMutations,
  useMcpQuery,
} from "@/features/mcp-editor/api/mcp.queries"
import { m } from "@/paraglide/messages"
import type { McpConnectionStatus, McpServer } from "@/shared/types"
import { McpDetailView } from "./McpDetailView"

interface McpDetailPanelProps {
  server: McpServer
  /** Resolved config file path — enables "Open in Editor" */
  filePath?: string
  /** When provided, shows "Edit" menu item */
  onEdit?: () => void
  /** When provided, shows "Delete" menu item with confirmation */
  onDelete?: () => void
  /** When provided, shows close (X) button in header */
  onClose?: () => void
  status?: McpConnectionStatus
}

export function McpDetailPanel({
  server,
  filePath,
  onEdit,
  onDelete,
  onClose,
  status,
}: McpDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { toggleMutation } = useMcpMutations()
  const { data: servers = [] } = useMcpQuery()

  // Use fresh data from query cache to stay in sync with list toggles
  const freshServer =
    servers.find((s) => s.name === server.name && s.scope === server.scope) ??
    server

  const isFromPlugin = !!server.fromPlugin
  const isEnabled = !freshServer.disabled
  const hasAnyAction =
    !!filePath || (!isFromPlugin && !!onEdit) || (!isFromPlugin && !!onDelete)

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
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {server.name}
        </h2>
        <span className="flex items-center gap-1">
          {!isFromPlugin && (
            <Switch
              size="sm"
              checked={isEnabled}
              disabled={toggleMutation.isPending}
              onCheckedChange={(checked) => {
                toggleMutation.mutate(
                  { name: server.name, enable: !!checked },
                  { onError: () => toast.error(m.mcp_toggle_error()) },
                )
              }}
            />
          )}
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
                {onEdit && !isFromPlugin && (
                  <>
                    {filePath && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={onEdit}>
                      <PencilIcon className="size-4" />
                      {m.action_edit()}
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && !isFromPlugin && (
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
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 size-8"
              onClick={onClose}
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </span>
      </div>

      {/* Content */}
      <McpDetailView server={server} status={status} />

      {/* Plugin 서버 안내 */}
      {isFromPlugin && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This server is provided by plugin{" "}
            <span className="font-medium text-foreground">
              {server.fromPlugin}
            </span>
            . To manage it, go to the{" "}
            <a
              href="/global/plugins"
              className="text-primary underline-offset-2 hover:underline"
            >
              Plugins page
            </a>
            .
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      {onDelete && !isFromPlugin && (
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

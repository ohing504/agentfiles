import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import { SpinnerButton } from "@/components/SpinnerButton"
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
import { titleCase } from "@/lib/format"
import { m } from "@/paraglide/messages"
import type { Plugin } from "@/shared/types"
import { usePluginMutations } from "../api/plugins.queries"

interface PluginActionBarProps {
  plugin: Plugin
  onUninstalled?: () => void
}

export function PluginActionBar({
  plugin,
  onUninstalled,
}: PluginActionBarProps) {
  const { toggleMutation, updateMutation, uninstallMutation } =
    usePluginMutations()
  const [pendingUninstall, setPendingUninstall] = useState(false)

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!plugin.installPath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath: plugin.installPath, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {titleCase(plugin.name)}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <SpinnerButton
            variant="outline"
            size="sm"
            onClick={() =>
              updateMutation.mutate(
                { id: plugin.id },
                {
                  onSuccess: () => toast.success(m.plugin_update_success()),
                  onError: (e) =>
                    toast.error(e.message || m.plugin_update_error()),
                },
              )
            }
            loading={updateMutation.isPending}
          >
            {m.plugin_update_btn()}
          </SpinnerButton>

          <Switch
            checked={plugin.enabled}
            onCheckedChange={(checked) =>
              toggleMutation.mutate(
                {
                  id: plugin.id,
                  enable: checked,
                  scope: plugin.scope,
                },
                {
                  onError: (e) =>
                    toast.error(e.message || m.plugin_update_error()),
                },
              )
            }
            disabled={toggleMutation.isPending}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="More options"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!plugin.installPath}
                onClick={() => handleOpenInEditor("code")}
              >
                <VscodeIcon className="size-4" />
                {m.plugin_open_vscode()}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!plugin.installPath}
                onClick={() => handleOpenInEditor("cursor")}
              >
                <CursorIcon className="size-4" />
                {m.plugin_open_cursor()}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPendingUninstall(true)}
              >
                <Trash2 className="size-4" />
                {m.plugin_uninstall()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={pendingUninstall} onOpenChange={setPendingUninstall}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.plugin_uninstall_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.plugin_uninstall_confirm({ name: titleCase(plugin.name) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.plugin_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                uninstallMutation.mutate(
                  { id: plugin.id, scope: plugin.scope },
                  {
                    onSuccess: () => {
                      setPendingUninstall(false)
                      onUninstalled?.()
                    },
                    onError: (e) => {
                      setPendingUninstall(false)
                      toast.error(e.message || m.plugin_update_error())
                    },
                  },
                )
              }}
            >
              {m.plugin_uninstall()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

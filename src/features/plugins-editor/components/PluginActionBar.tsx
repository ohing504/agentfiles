import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import type { usePluginMutations } from "../api/plugins.queries"

type Mutations = ReturnType<typeof usePluginMutations>

interface PluginActionBarProps {
  plugin: Plugin
  toggleMutation: Mutations["toggleMutation"]
  updateMutation: Mutations["updateMutation"]
  uninstallMutation: Mutations["uninstallMutation"]
  onUninstalled?: () => void
}

export function PluginActionBar({
  plugin,
  toggleMutation,
  updateMutation,
  uninstallMutation,
  onUninstalled,
}: PluginActionBarProps) {
  const [pendingUninstall, setPendingUninstall] = useState(false)

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
            Update
          </SpinnerButton>

          <Switch
            checked={plugin.enabled}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({
                id: plugin.id,
                enable: checked,
                scope: plugin.scope,
              })
            }
            disabled={toggleMutation.isPending}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!plugin.installPath}
                onClick={() => {
                  if (plugin.installPath) {
                    window.open(`vscode://file/${plugin.installPath}`, "_blank")
                  }
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPendingUninstall(true)}
              >
                <Trash2 className="size-4" />
                Uninstall
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={pendingUninstall} onOpenChange={setPendingUninstall}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Plugin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uninstall "{titleCase(plugin.name)}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                uninstallMutation.mutate(
                  { id: plugin.id, scope: plugin.scope },
                  {
                    onSuccess: () => {
                      setPendingUninstall(false)
                      onUninstalled?.()
                    },
                    onError: () => {
                      setPendingUninstall(false)
                    },
                  },
                )
              }}
            >
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

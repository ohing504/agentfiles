import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import { useHooksMutations } from "../api/hooks.queries"
import { getHookDisplayName } from "../constants"
import { useHooksSelection } from "../context/HooksContext"

export function HookActionBar() {
  const {
    selectedHook,
    setEditingHook,
    pendingDelete,
    setPendingDelete,
    handleClearSelection,
  } = useHooksSelection()

  const { removeMutation } = useHooksMutations(selectedHook?.scope ?? "global")

  if (!selectedHook) return null

  function handleDelete() {
    if (!selectedHook) return
    removeMutation.mutate(
      {
        event: selectedHook.event,
        groupIndex: selectedHook.groupIndex,
        hookIndex: selectedHook.hookIndex,
      },
      {
        onSuccess: () => {
          setPendingDelete(null)
          handleClearSelection()
        },
        onError: (e) => {
          setPendingDelete(null)
          toast.error(e.message || "Failed to delete hook")
        },
      },
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {getHookDisplayName(selectedHook.hook)}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              {m.action_edit()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingHook(selectedHook)}>
              <Pencil className="size-4" />
              {m.action_edit()}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(selectedHook)}
            >
              <Trash2 className="size-4" />
              {m.action_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hook? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

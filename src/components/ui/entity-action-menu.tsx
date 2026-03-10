import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { EntityAction, EntityActionId } from "@/lib/entity-actions"
import { m } from "@/paraglide/messages"

// --- i18n label resolver ---

function getActionLabel(action: EntityAction): string {
  switch (action.id) {
    case "open-vscode":
      return m.common_open_vscode()
    case "open-cursor":
      return m.common_open_cursor()
    case "open-folder":
      return m.skills_open_folder()
    case "edit":
      return m.action_edit()
    case "delete":
      return m.action_delete()
    default:
      return action.label
  }
}

// --- Shared delete confirmation dialog ---

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? m.action_delete()}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {m.action_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// --- EntityActionContextMenu (right-click) ---

interface ActionMenuSharedProps {
  actions: EntityAction[]
  onAction: (id: EntityActionId) => void
  /** Item name shown in delete confirmation dialog */
  itemName?: string
  deleteTitle?: string
  deleteDescription?: string
}

export function EntityActionContextMenu({
  actions,
  onAction,
  itemName,
  deleteTitle,
  deleteDescription,
  children,
}: ActionMenuSharedProps & { children: React.ReactNode }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (actions.length === 0) return <>{children}</>

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
        <ContextMenuContent>
          {actions.map((action) => (
            <span key={action.id}>
              {action.separatorBefore && <ContextMenuSeparator />}
              <ContextMenuItem
                variant={action.variant}
                onSelect={() => {
                  if (action.id === "delete") {
                    setShowDeleteConfirm(true)
                  } else {
                    onAction(action.id)
                  }
                }}
              >
                <action.icon className="size-4" />
                {getActionLabel(action)}
              </ContextMenuItem>
            </span>
          ))}
        </ContextMenuContent>
      </ContextMenu>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={deleteTitle ?? (itemName ? `${m.action_delete()} "${itemName}"?` : undefined)}
        description={deleteDescription}
        onConfirm={() => onAction("delete")}
      />
    </>
  )
}

// --- EntityActionDropdown (⋯ button) ---

export function EntityActionDropdown({
  actions,
  onAction,
  itemName,
  deleteTitle,
  deleteDescription,
}: ActionMenuSharedProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (actions.length === 0) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => (
            <span key={action.id}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.variant}
                onClick={(e) => e.stopPropagation()}
                onSelect={() => {
                  if (action.id === "delete") {
                    setShowDeleteConfirm(true)
                  } else {
                    onAction(action.id)
                  }
                }}
              >
                <action.icon className="size-4" />
                {getActionLabel(action)}
              </DropdownMenuItem>
            </span>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={deleteTitle ?? (itemName ? `${m.action_delete()} "${itemName}"?` : undefined)}
        description={deleteDescription}
        onConfirm={() => onAction("delete")}
      />
    </>
  )
}

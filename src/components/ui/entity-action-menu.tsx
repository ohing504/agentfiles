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
    case "remove-from-agent":
      return m.action_remove_from_agent()
    default:
      return action.label
  }
}

// --- Shared delete/remove confirmation dialog ---

type DestructiveActionId = "delete" | "remove-from-agent" | null

function DestructiveConfirmDialog({
  actionId,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  actionId: DestructiveActionId
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={actionId !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
            {confirmLabel ?? m.action_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function getDestructiveDialogProps(
  actionId: DestructiveActionId,
  itemName?: string,
  deleteTitle?: string,
  deleteDescription?: string,
): { title?: string; description?: string; confirmLabel?: string } {
  if (actionId === "remove-from-agent") {
    return {
      title: itemName
        ? `${m.action_remove_from_agent()} "${itemName}"?`
        : m.action_remove_from_agent(),
      description: m.action_remove_from_agent_desc(),
      confirmLabel: m.action_remove_from_agent(),
    }
  }
  return {
    title:
      deleteTitle ??
      (itemName ? `${m.action_delete()} "${itemName}"?` : undefined),
    description: deleteDescription ?? m.action_delete_all_desc(),
  }
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
  const [confirmAction, setConfirmAction] =
    useState<DestructiveActionId>(null)

  if (actions.length === 0) return <>{children}</>

  const dialogProps = getDestructiveDialogProps(
    confirmAction,
    itemName,
    deleteTitle,
    deleteDescription,
  )

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
                  if (
                    action.id === "delete" ||
                    action.id === "remove-from-agent"
                  ) {
                    setConfirmAction(action.id)
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

      <DestructiveConfirmDialog
        actionId={confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        {...dialogProps}
        onConfirm={() => {
          if (confirmAction) onAction(confirmAction)
        }}
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
  const [confirmAction, setConfirmAction] =
    useState<DestructiveActionId>(null)

  if (actions.length === 0) return null

  const dialogProps = getDestructiveDialogProps(
    confirmAction,
    itemName,
    deleteTitle,
    deleteDescription,
  )

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
        <DropdownMenuContent align="end" className="min-w-44">
          {actions.map((action) => (
            <span key={action.id}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.variant}
                onClick={(e) => e.stopPropagation()}
                onSelect={() => {
                  if (
                    action.id === "delete" ||
                    action.id === "remove-from-agent"
                  ) {
                    setConfirmAction(action.id)
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

      <DestructiveConfirmDialog
        actionId={confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        {...dialogProps}
        onConfirm={() => {
          if (confirmAction) onAction(confirmAction)
        }}
      />
    </>
  )
}

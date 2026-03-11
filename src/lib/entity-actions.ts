import type { LucideIcon } from "lucide-react"
import { FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type React from "react"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"

export type EntityActionId =
  | "open-vscode"
  | "open-cursor"
  | "open-folder"
  | "edit"
  | "delete"
  | "remove-from-agent"

export interface EntityAction {
  id: EntityActionId
  label: string
  icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>
  variant?: "destructive"
  separatorBefore?: boolean
}

export type EntityActionType =
  | "skill"
  | "agent"
  | "hook"
  | "plugin"
  | "mcp"
  | "lsp"

// --- Reusable action atoms ---

const openVscode: EntityAction = {
  id: "open-vscode",
  label: "VS Code",
  icon: VscodeIcon,
}

const openCursor: EntityAction = {
  id: "open-cursor",
  label: "Cursor",
  icon: CursorIcon,
}

const openFolder: EntityAction = {
  id: "open-folder",
  label: "Open Folder",
  icon: FolderOpen,
}

const edit: EntityAction = {
  id: "edit",
  label: "Edit",
  icon: Pencil,
  separatorBefore: true,
}

const removeFromAgent: EntityAction = {
  id: "remove-from-agent",
  label: "Remove from Agent",
  icon: Trash2,
  variant: "destructive",
  separatorBefore: true,
}

const deleteAction: EntityAction = {
  id: "delete",
  label: "Delete",
  icon: Trash2,
  variant: "destructive",
}

// --- Entity action definitions ---

export const ENTITY_ACTIONS: Record<EntityActionType, EntityAction[]> = {
  skill: [openVscode, openCursor, openFolder, removeFromAgent, deleteAction],
  agent: [openVscode, openCursor, edit, deleteAction],
  hook: [openVscode, openCursor, edit, deleteAction],
  plugin: [openVscode, openCursor, deleteAction],
  mcp: [openVscode, openCursor, edit, deleteAction],
  lsp: [openVscode, openCursor],
}

export { MoreHorizontal }

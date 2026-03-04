import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import type { EntityActionId } from "@/lib/entity-actions"
import type { DashboardDetailTarget } from "../types"

type NonNullTarget = NonNullable<DashboardDetailTarget>

/**
 * Returns an action handler for dashboard entity context-menu / dropdown actions.
 * Accepts an optional `onAfterDelete` callback to clear selection when an item is removed.
 */
export function useEntityActionHandler(onAfterDelete?: () => void) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { activeProjectPath } = useProjectContext()

  return async (actionId: EntityActionId, target: NonNullTarget) => {
    try {
      switch (actionId) {
        case "open-vscode":
        case "open-cursor": {
          const filePath = getFilePath(target)
          if (!filePath) return
          const editor = actionId === "open-vscode" ? "code" : "cursor"
          const { openInEditorFn } = await import("@/server/editor")
          await openInEditorFn({ data: { filePath, editor } })
          break
        }

        case "open-folder": {
          if (target.type === "skill" && target.skill.isSkillDir) {
            const dirPath = target.skill.path.replace(/\/SKILL\.md$/, "")
            const { openFolderFn } = await import("@/server/editor")
            await openFolderFn({ data: { dirPath } })
          }
          break
        }

        case "edit": {
          const route = getEditorRoute(target)
          if (route) navigate({ to: route })
          break
        }

        case "delete": {
          await handleDelete(target, activeProjectPath)
          queryClient.invalidateQueries()
          onAfterDelete?.()
          break
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    }
  }
}

// --- helpers ---

function getFilePath(target: NonNullTarget): string | undefined {
  switch (target.type) {
    case "skill":
      return target.skill.path
    case "agent":
      return target.agent.path
    case "plugin":
      return target.plugin.installPath
    case "mcp":
      return target.server.configPath
    case "hook":
      // Hooks live inside settings.json — no single file to open
      return undefined
  }
}

function getEditorRoute(target: NonNullTarget): string | undefined {
  switch (target.type) {
    case "skill":
      return "/skills"
    case "agent":
      return "/agents"
    case "hook":
      return "/hooks"
    case "mcp":
      return "/mcp"
    case "plugin":
      return "/plugins"
  }
}

async function handleDelete(target: NonNullTarget, activeProjectPath?: string) {
  switch (target.type) {
    case "skill":
    case "agent": {
      const item = target.type === "skill" ? target.skill : target.agent
      const { deleteItemFn } = await import("@/server/items")
      await deleteItemFn({
        data: {
          type: item.type,
          name: item.name,
          scope: item.scope,
          projectPath: activeProjectPath,
        },
      })
      break
    }

    case "plugin": {
      const { plugin } = target
      const { uninstallPluginFn } = await import(
        "@/features/plugins-editor/api/plugins.functions"
      )
      await uninstallPluginFn({
        data: {
          id: plugin.id,
          scope: plugin.scope,
          projectPath: plugin.projectPath,
        },
      })
      break
    }

    case "mcp": {
      const { server } = target
      const { removeMcpServerFn } = await import(
        "@/features/mcp-editor/api/mcp.functions"
      )
      await removeMcpServerFn({
        data: {
          name: server.name,
          scope: server.scope,
          projectPath: activeProjectPath,
        },
      })
      break
    }

    case "hook": {
      const scope = target.scope
      if (!scope) return
      const { removeHookFn } = await import(
        "@/features/hooks-editor/api/hooks.functions"
      )
      await removeHookFn({
        data: {
          event: target.event as Parameters<
            typeof removeHookFn
          >[0]["data"]["event"],
          groupIndex: 0,
          hookIndex: 0,
          scope,
          projectPath: activeProjectPath,
        },
      })
      break
    }
  }
}

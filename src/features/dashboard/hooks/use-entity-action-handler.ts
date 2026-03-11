import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import type { EntityActionId } from "@/lib/entity-actions"
import { queryKeys } from "@/lib/query-keys"
import { m } from "@/paraglide/messages"
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
          const itemName = getItemName(target)
          onAfterDelete?.()
          await toast.promise(
            handleDelete(target, activeProjectPath).then(() => {
              queryClient.invalidateQueries({
                queryKey: queryKeys.agentFiles.all,
              })
              queryClient.invalidateQueries({
                queryKey: queryKeys.overview.all,
              })
            }),
            {
              loading: m.toast_deleting({ name: itemName }),
              success: m.toast_deleted({ name: itemName }),
              error: (err: unknown) =>
                err instanceof Error ? err.message : m.toast_delete_failed(),
            },
          )
          return
        }

        case "remove-from-agent": {
          if (target.type === "skill") {
            const itemName = target.skill.name
            onAfterDelete?.()
            const { deleteItemFn } = await import("@/server/items")
            await toast.promise(
              deleteItemFn({
                data: {
                  type: "skill",
                  name: target.skill.name,
                  scope: target.skill.scope,
                  agent: "claude-code",
                  projectPath: activeProjectPath,
                },
              }).then(() => {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.agentFiles.all,
                })
                queryClient.invalidateQueries({
                  queryKey: queryKeys.overview.all,
                })
              }),
              {
                loading: m.toast_removing({ name: itemName }),
                success: m.toast_removed_from_agent({ name: itemName }),
                error: (err: unknown) =>
                  err instanceof Error ? err.message : m.toast_remove_failed(),
              },
            )
          }
          return
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    }
  }
}

// --- helpers ---

function getItemName(target: NonNullTarget): string {
  switch (target.type) {
    case "skill":
      return target.skill.name
    case "agent":
      return target.agent.name
    case "plugin":
      return target.plugin.id
    case "mcp":
      return target.server.name
    case "hook":
      return target.event
    case "memory":
      return target.file.name
    case "file":
      return target.filePath
  }
}

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

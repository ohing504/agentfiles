// src/features/dashboard/components/LspServersPanel.tsx
import { Code } from "lucide-react"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

async function handleLspAction(id: EntityActionId, installPath?: string) {
  if (!installPath) return
  if (id === "open-vscode" || id === "open-cursor") {
    const editor = id === "open-vscode" ? "code" : "cursor"
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath: installPath, editor } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open editor")
    }
  }
}

export function LspServersPanel() {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)

  const lspServers = plugins.flatMap((p) =>
    (p.contents?.lspServers ?? []).map((s) => ({
      ...s,
      pluginName: p.name,
      scope: p.scope,
      installPath: p.installPath,
    })),
  )
  const groups = groupByScope(lspServers)

  return (
    <OverviewPanel title="LSP Servers" count={lspServers.length}>
      {lspServers.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">
          No LSP servers
        </p>
      ) : (
        <div>
          {groups.map((group) => (
            <ScopeGroup key={group.scope} scope={group.scope}>
              {group.items.map((server, i) => (
                <EntityActionContextMenu
                  key={`${server.name}-${i}`}
                  actions={ENTITY_ACTIONS.lsp}
                  onAction={(id) => handleLspAction(id, server.installPath)}
                  itemName={server.name}
                >
                  <ListItem
                    icon={Code}
                    label={server.name}
                    trailing={
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground/50">
                          {server.pluginName}
                        </span>
                        <EntityActionDropdown
                          actions={ENTITY_ACTIONS.lsp}
                          onAction={(id) =>
                            handleLspAction(id, server.installPath)
                          }
                          itemName={server.name}
                        />
                      </span>
                    }
                  />
                </EntityActionContextMenu>
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

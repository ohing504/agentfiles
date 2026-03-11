// src/components/board/LspServersPanel.tsx
import { Code } from "lucide-react"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { usePluginsQuery } from "@/hooks/use-plugins"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { m } from "@/paraglide/messages"

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

interface LspServersPanelProps {
  scopeFilter?: string
}

export function LspServersPanel({ scopeFilter }: LspServersPanelProps) {
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
  const filtered = scopeFilter
    ? lspServers.filter((s) => s.scope === scopeFilter)
    : lspServers

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <Code />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_lsp()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {filtered.map((server, i) => (
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
                  onAction={(id) => handleLspAction(id, server.installPath)}
                  itemName={server.name}
                />
              </span>
            }
          />
        </EntityActionContextMenu>
      ))}
    </div>
  )
}

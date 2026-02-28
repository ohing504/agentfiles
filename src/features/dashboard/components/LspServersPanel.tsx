// src/features/dashboard/components/LspServersPanel.tsx
import { Code } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import { ListItem } from "@/components/ui/list-item"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

export function LspServersPanel() {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)

  const lspServers = plugins.flatMap((p) =>
    (p.contents?.lspServers ?? []).map((s) => ({
      ...s,
      pluginName: p.name,
      scope: p.scope,
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
                <ListItem
                  key={`${server.name}-${i}`}
                  icon={Code}
                  label={server.name}
                  trailing={
                    <span className="text-[10px] text-muted-foreground/50">
                      {server.pluginName}
                    </span>
                  }
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

// src/features/dashboard/components/LspServersPanel.tsx
import { Code } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
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
                <div
                  key={`${server.name}-${i}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
                >
                  <Code className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{server.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                    {server.pluginName}
                  </span>
                </div>
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

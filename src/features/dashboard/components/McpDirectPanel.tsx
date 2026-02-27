import { Server } from "lucide-react"
import { useMcpQuery } from "@/features/mcp-editor/api/mcp.queries"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

export function McpDirectPanel() {
  const { data: servers = [] } = useMcpQuery()
  // Plugin-provided servers are visible in the Plugins panel — exclude them here
  const directServers = servers.filter((s) => !s.fromPlugin)
  const groups = groupByScope(directServers)

  return (
    <OverviewPanel title="MCP Servers" count={directServers.length}>
      {directServers.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">
          No MCP servers
        </p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((server) => (
                <div
                  key={`${server.scope}-${server.name}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
                >
                  <Server className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{server.name}</span>
                </div>
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

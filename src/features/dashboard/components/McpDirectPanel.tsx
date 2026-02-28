import { ListItem } from "@/components/ui/list-item"
import {
  useMcpQuery,
  useMcpStatusQuery,
} from "@/features/mcp-editor/api/mcp.queries"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { getMcpIconClass } from "@/lib/mcp-status"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface McpDirectPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function McpDirectPanel({ onSelectItem }: McpDirectPanelProps) {
  const { data: servers = [] } = useMcpQuery()
  const { data: statusMap } = useMcpStatusQuery()
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
                <ListItem
                  key={`${server.scope}-${server.name}`}
                  icon={ENTITY_ICONS.mcp}
                  iconClassName={getMcpIconClass(server, statusMap)}
                  label={server.name}
                  onClick={() => onSelectItem?.({ type: "mcp", server })}
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

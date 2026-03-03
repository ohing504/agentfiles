import { toast } from "sonner"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { Switch } from "@/components/ui/switch"
import {
  useMcpMutations,
  useMcpQuery,
  useMcpStatusQuery,
} from "@/features/mcp-editor/api/mcp.queries"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { getMcpIconClass } from "@/lib/mcp-status"
import { m } from "@/paraglide/messages"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface McpDirectPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  href?: string
}

export function McpDirectPanel({
  onSelectItem,
  onAction,
  href,
}: McpDirectPanelProps) {
  const { data: servers = [] } = useMcpQuery()
  const { data: statusMap } = useMcpStatusQuery()
  const { toggleMutation } = useMcpMutations()
  // Plugin-provided servers are visible in the Plugins panel — exclude them here
  const directServers = servers.filter((s) => !s.fromPlugin)
  const groups = groupByScope(directServers)

  return (
    <OverviewPanel title="MCP Servers" count={directServers.length} href={href}>
      {directServers.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">
          No MCP servers
        </p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((server) => {
                const target = { type: "mcp" as const, server }
                return (
                  <EntityActionContextMenu
                    key={`${server.scope}-${server.name}`}
                    actions={ENTITY_ACTIONS.mcp}
                    onAction={(id) => onAction?.(id, target)}
                    itemName={server.name}
                  >
                    <ListItem
                      icon={ENTITY_ICONS.mcp}
                      iconClassName={getMcpIconClass(server, statusMap)}
                      label={server.name}
                      trailing={
                        <span className="flex items-center gap-1">
                          <Switch
                            size="sm"
                            checked={!server.disabled}
                            disabled={toggleMutation.isPending}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(checked) => {
                              toggleMutation.mutate(
                                { name: server.name, enable: !!checked },
                                {
                                  onError: () =>
                                    toast.error(m.mcp_toggle_error()),
                                },
                              )
                            }}
                          />
                          <EntityActionDropdown
                            actions={ENTITY_ACTIONS.mcp}
                            onAction={(id) => onAction?.(id, target)}
                            itemName={server.name}
                          />
                        </span>
                      }
                      onClick={() => onSelectItem?.(target)}
                    />
                  </EntityActionContextMenu>
                )
              })}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

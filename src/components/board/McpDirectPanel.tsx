import { toast } from "sonner"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
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
} from "@/hooks/use-mcp"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { getMcpIconClass } from "@/lib/mcp-status"
import { m } from "@/paraglide/messages"
import type { DashboardDetailTarget } from "./types"

interface McpDirectPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

export function McpDirectPanel({
  scopeFilter,
  onSelectItem,
  onAction,
}: McpDirectPanelProps) {
  const { data: servers = [] } = useMcpQuery()
  const { data: statusMap } = useMcpStatusQuery()
  const { toggleMutation } = useMcpMutations()
  // Plugin-provided servers are visible in the Plugins panel — exclude them here
  const directServers = servers.filter((s) => !s.fromPlugin)
  const filtered = scopeFilter
    ? directServers.filter((s) => s.scope === scopeFilter)
    : directServers

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <ENTITY_ICONS.mcp />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_mcp()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {filtered.map((server) => {
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
                          onError: () => toast.error(m.mcp_toggle_error()),
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
    </div>
  )
}

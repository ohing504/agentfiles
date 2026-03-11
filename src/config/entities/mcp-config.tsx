import type { DashboardDetailTarget } from "@/components/board/types"
import { McpDetailView } from "@/components/entity/McpDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { McpServer } from "@/shared/types"

function McpDetailContent({ item }: { item: McpServer }) {
  return <McpDetailView server={item} />
}

export const mcpConfig: EntityConfig<McpServer> = {
  type: "mcp",
  icon: ENTITY_ICONS.mcp,
  actions: ENTITY_ACTIONS.mcp.map((a) => a.id),
  getKey: (item) => `${item.scope}:${item.name}`,
  getLabel: (item) => item.name,
  getScope: (item) => item.scope,
  DetailContent: McpDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "mcp",
    server: item,
  }),
}

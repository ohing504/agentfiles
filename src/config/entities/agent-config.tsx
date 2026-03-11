import type { DashboardDetailTarget } from "@/components/board/types"
import { AgentDetailView } from "@/components/entity/AgentDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { AgentFile } from "@/shared/types"

function AgentDetailContent({ item }: { item: AgentFile }) {
  return <AgentDetailView item={item} />
}

export const agentConfig: EntityConfig<AgentFile> = {
  type: "agent",
  icon: ENTITY_ICONS.agent,
  actions: ENTITY_ACTIONS.agent.map((a) => a.id),
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  getDescription: (item) => item.frontmatter?.description,
  getScope: (item) => item.scope,
  DetailContent: AgentDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "agent",
    agent: item,
  }),
}

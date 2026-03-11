import type { DashboardDetailTarget } from "@/components/board/types"
import { SkillDetailView } from "@/components/entity/SkillDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { AgentFile } from "@/shared/types"

function SkillDetailContent({ item }: { item: AgentFile }) {
  return <SkillDetailView skill={item} />
}

export const skillConfig: EntityConfig<AgentFile> = {
  type: "skill",
  icon: ENTITY_ICONS.skill,
  actions: ENTITY_ACTIONS.skill.map((a) => a.id),
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  getDescription: (item) => item.frontmatter?.description,
  getScope: (item) => item.scope,
  DetailContent: SkillDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "skill",
    skill: item,
  }),
}

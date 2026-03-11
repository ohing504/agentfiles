import type { DashboardDetailTarget } from "@/components/board/types"
import { PluginDetailView } from "@/components/entity/PluginDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { Plugin } from "@/shared/types"

function PluginDetailContent({ item }: { item: Plugin }) {
  return <PluginDetailView item={item} />
}

export const pluginConfig: EntityConfig<Plugin> = {
  type: "plugin",
  icon: ENTITY_ICONS.plugin,
  actions: ENTITY_ACTIONS.plugin.map((a) => a.id),
  getKey: (item) => item.id,
  getLabel: (item) => item.name,
  getDescription: (item) => (item.version ? `v${item.version}` : undefined),
  getScope: (item) => item.scope,
  DetailContent: PluginDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "plugin",
    plugin: item,
  }),
}

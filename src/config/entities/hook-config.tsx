import type { DashboardDetailTarget } from "@/components/board/types"
import { HookDetailView } from "@/components/entity/HookDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { HookEntry, HookScope } from "@/shared/types"

export interface HookItem {
  entry: HookEntry
  event: string
  matcher?: string
  scope: HookScope
}

function HookDetailContent({ item }: { item: HookItem }) {
  return (
    <HookDetailView
      hook={item.entry}
      event={item.event}
      matcher={item.matcher}
    />
  )
}

export const hookConfig: EntityConfig<HookItem> = {
  type: "hook",
  icon: ENTITY_ICONS.hook,
  actions: ENTITY_ACTIONS.hook.map((a) => a.id),
  getKey: (item) =>
    `${item.scope}:${item.event}:${item.matcher ?? ""}:${item.entry.command ?? item.entry.prompt ?? ""}`,
  getLabel: (item) => item.entry.command ?? item.entry.prompt ?? item.event,
  getScope: (item) => item.scope,
  groupBy: (item) => item.event,
  DetailContent: HookDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "hook",
    hook: item.entry,
    event: item.event,
    matcher: item.matcher,
    scope: item.scope,
  }),
}

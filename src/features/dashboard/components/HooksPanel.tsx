import { Zap } from "lucide-react"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { useHooksQuery } from "@/features/hooks-editor/api/hooks.queries"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { m } from "@/paraglide/messages"
import type { HookScope, HooksSettings } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"

interface HooksPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

function buildHookItems(hooks: HooksSettings) {
  return Object.entries(hooks).map(([event, groups]) => ({
    event,
    firstHook: groups?.[0]?.hooks?.[0],
    matcher: groups?.[0]?.matcher,
  }))
}

export function HooksPanel({
  scopeFilter,
  onSelectItem,
  onAction,
}: HooksPanelProps) {
  const { data: globalHooks = {} } = useHooksQuery("user")
  const { data: projectHooks = {} } = useHooksQuery("project")

  // Build scoped item groups based on filter
  const groups: {
    items: ReturnType<typeof buildHookItems>
    scope: HookScope
  }[] = []

  if (!scopeFilter || scopeFilter === "user") {
    const items = buildHookItems(globalHooks)
    if (items.length > 0) groups.push({ items, scope: "user" })
  }
  if (!scopeFilter || scopeFilter === "project") {
    const items = buildHookItems(projectHooks)
    if (items.length > 0) groups.push({ items, scope: "project" })
  }

  if (groups.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <Zap />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_hooks()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {groups.flatMap(({ items, scope }) =>
        items.map(({ event, firstHook, matcher }) => {
          if (!firstHook) return null
          const target = {
            type: "hook" as const,
            hook: firstHook,
            event,
            matcher,
            scope,
          }
          return (
            <EntityActionContextMenu
              key={`${scope}-${event}`}
              actions={ENTITY_ACTIONS.hook}
              onAction={(id) => onAction?.(id, target)}
              itemName={event}
            >
              <ListItem
                icon={Zap}
                label={event}
                trailing={
                  <span className="flex items-center gap-1">
                    {firstHook.command && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px] font-mono">
                        {firstHook.command}
                      </span>
                    )}
                    <EntityActionDropdown
                      actions={ENTITY_ACTIONS.hook}
                      onAction={(id) => onAction?.(id, target)}
                      itemName={event}
                    />
                  </span>
                }
                onClick={() => onSelectItem?.(target)}
              />
            </EntityActionContextMenu>
          )
        }),
      )}
    </div>
  )
}

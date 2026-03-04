import { Zap } from "lucide-react"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { useHooksQuery } from "@/features/hooks-editor/api/hooks.queries"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import type { HookScope, HooksSettings } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { ScopeGroup } from "./ScopeGroup"

interface HooksPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  href?: string
}

function buildHookItems(hooks: HooksSettings) {
  return Object.entries(hooks).map(([event, groups]) => ({
    event,
    firstHook: groups?.[0]?.hooks?.[0],
    matcher: groups?.[0]?.matcher,
  }))
}

export function HooksPanel({ onSelectItem, onAction, href }: HooksPanelProps) {
  const { data: globalHooks = {} } = useHooksQuery("user")
  const { data: projectHooks = {} } = useHooksQuery("project")

  const globalItems = buildHookItems(globalHooks)
  const projectItems = buildHookItems(projectHooks)
  const totalCount = globalItems.length + projectItems.length

  function renderHookList(
    items: ReturnType<typeof buildHookItems>,
    scope: HookScope,
    keyPrefix: string,
  ) {
    return items.map(({ event, firstHook, matcher }) => {
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
          key={`${keyPrefix}-${event}`}
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
    })
  }

  return (
    <OverviewPanel title="Hooks" count={totalCount} href={href}>
      {totalCount === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No hooks</p>
      ) : (
        <div>
          {globalItems.length > 0 && (
            <ScopeGroup scope="user">
              {renderHookList(globalItems, "user", "global")}
            </ScopeGroup>
          )}
          {projectItems.length > 0 && (
            <ScopeGroup scope="project">
              {renderHookList(projectItems, "project", "project")}
            </ScopeGroup>
          )}
        </div>
      )}
    </OverviewPanel>
  )
}

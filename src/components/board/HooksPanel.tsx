import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { useHooksQuery } from "@/hooks/use-hooks"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { getHookIcon } from "@/lib/hook-constants"
import { m } from "@/paraglide/messages"
import type {
  HookEntry,
  HookMatcherGroup,
  HookScope,
  HooksSettings,
} from "@/shared/types"
import type { DashboardDetailTarget } from "./types"

/** Shorten a hook command for display: show basename for paths, full for short commands */
function shortenCommand(hook: HookEntry): string {
  const raw = hook.command ?? hook.prompt ?? hook.type
  // If it looks like a path (contains /), show just the last segment
  if (raw.includes("/")) {
    const basename = raw.split("/").pop() ?? raw
    return basename
  }
  return raw
}

interface HooksPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

interface EventItem {
  event: string
  groups: HookMatcherGroup[]
  allHooks: HookEntry[]
  scope: HookScope
}

function buildEventItems(hooks: HooksSettings, scope: HookScope): EventItem[] {
  return Object.entries(hooks)
    .filter(([, groups]) => groups && groups.length > 0)
    .map(([event, groups]) => {
      const allHooks = (groups ?? []).flatMap((g) => g.hooks)
      return { event, groups: groups ?? [], allHooks, scope }
    })
}

export function HooksPanel({
  scopeFilter,
  onSelectItem,
  onAction,
}: HooksPanelProps) {
  const { data: globalHooks = {} } = useHooksQuery("user")
  const { data: projectHooks = {} } = useHooksQuery("project")

  const eventItems = useMemo(() => {
    const items: EventItem[] = []
    if (!scopeFilter || scopeFilter === "user")
      items.push(...buildEventItems(globalHooks, "user"))
    if (!scopeFilter || scopeFilter === "project")
      items.push(...buildEventItems(projectHooks, "project"))
    return items
  }, [globalHooks, projectHooks, scopeFilter])

  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current && eventItems.length > 0) {
      initialized.current = true
      setOpenEvents(
        new Set(eventItems.map(({ event, scope }) => `${scope}-${event}`)),
      )
    }
  }, [eventItems])

  function toggleEvent(key: string) {
    setOpenEvents((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (eventItems.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <ENTITY_ICONS.hook />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_hooks()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {eventItems.map(({ event, groups, allHooks, scope }) => {
        const key = `${scope}-${event}`
        if (allHooks.length === 0) return null

        const isOpen = openEvents.has(key)

        return (
          <ListItem
            key={key}
            icon={ENTITY_ICONS.hook}
            label={event}
            trailing={
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {allHooks.length}
              </Badge>
            }
            open={isOpen}
            onClick={() => toggleEvent(key)}
          >
            {allHooks.map((hook, i) => {
              const hookTarget = {
                type: "hook" as const,
                hook,
                event,
                matcher: groups[0]?.matcher,
                scope,
              }
              const HookIcon = getHookIcon(hook)
              return (
                <EntityActionContextMenu
                  key={`${event}-${hook.command ?? hook.type}-${i}`}
                  actions={ENTITY_ACTIONS.hook}
                  onAction={(id) => onAction?.(id, hookTarget)}
                  itemName={hook.command ?? hook.type}
                >
                  <ListSubItem
                    icon={HookIcon}
                    label={shortenCommand(hook)}
                    trailing={
                      <EntityActionDropdown
                        actions={ENTITY_ACTIONS.hook}
                        onAction={(id) => onAction?.(id, hookTarget)}
                        itemName={hook.command ?? hook.type}
                      />
                    }
                    onClick={() => onSelectItem?.(hookTarget)}
                  />
                </EntityActionContextMenu>
              )
            })}
          </ListItem>
        )
      })}
    </div>
  )
}

import { ChevronRight, Plus, Zap } from "lucide-react"
import { memo, useMemo, useState } from "react"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"
import type {
  HookEventName,
  HookMatcherGroup,
  HookScope,
  HooksSettings,
} from "@/shared/types"
import {
  getHookDisplayName,
  getHookIcon,
  type SelectedHook,
} from "../constants"

// ── HooksScopeSection ────────────────────────────────────────────────────────

export const HooksScopeSection = memo(function HooksScopeSection({
  label,
  scope,
  hooks,
  searchQuery,
  selectedHook,
  onSelectHook,
  onAddClick,
}: {
  label: string
  scope: HookScope
  hooks: HooksSettings
  searchQuery: string
  selectedHook: SelectedHook | null
  onSelectHook: (hook: SelectedHook) => void
  onAddClick: () => void
}) {
  // Track which events are CLOSED (empty = all open by default)
  const [closedEvents, setClosedEvents] = useState<Set<string>>(new Set())

  function toggleEvent(event: string) {
    setClosedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  const eventEntries = Object.entries(hooks) as [
    HookEventName,
    HookMatcherGroup[],
  ][]

  // 검색 필터링이 적용된 이벤트 목록 계산
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return eventEntries.map(([event, groups]) => ({
        event,
        groups: groups.map((group, groupIndex) => ({
          group,
          groupIndex,
          hooks: group.hooks.map((hook, hookIndex) => ({ hook, hookIndex })),
        })),
      }))
    }

    const q = searchQuery.toLowerCase()
    return eventEntries
      .map(([event, groups]) => {
        const filteredGroups = groups
          .map((group, groupIndex) => {
            const filteredHooks = group.hooks
              .map((hook, hookIndex) => ({ hook, hookIndex }))
              .filter(({ hook }) => {
                const name = getHookDisplayName(hook).toLowerCase()
                const command = (hook.command ?? "").toLowerCase()
                const matcher = (group.matcher ?? "").toLowerCase()
                return (
                  name.includes(q) || command.includes(q) || matcher.includes(q)
                )
              })
            return { group, groupIndex, hooks: filteredHooks }
          })
          .filter(({ hooks }) => hooks.length > 0)
        return { event, groups: filteredGroups }
      })
      .filter(({ groups }) => groups.length > 0)
  }, [eventEntries, searchQuery])

  const hasHooks = eventEntries.length > 0

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between h-8 px-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center justify-center rounded p-0.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          aria-label={`Add hook to ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* 훅 목록 */}
      {!hasHooks ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">
          {m.hooks_no_configured()}
        </p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">
          {m.common_no_results()}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {filteredEvents.map(({ event, groups }) => {
            const isOpen = !closedEvents.has(event)
            const totalCount = groups.reduce(
              (sum, { hooks }) => sum + hooks.length,
              0,
            )
            return (
              <ListItem
                key={event}
                icon={Zap}
                label={event}
                trailing={
                  <>
                    <span className="text-[10px] text-muted-foreground/60">
                      {totalCount}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </>
                }
                open={isOpen}
                onClick={() => toggleEvent(event)}
              >
                {groups.map(({ group, groupIndex, hooks: filteredHooks }) =>
                  filteredHooks.map(({ hook, hookIndex }) => {
                    const Icon = getHookIcon(hook)
                    const name = getHookDisplayName(hook)
                    const isSelected =
                      selectedHook?.scope === scope &&
                      selectedHook.event === event &&
                      selectedHook.groupIndex === groupIndex &&
                      selectedHook.hookIndex === hookIndex

                    return (
                      <ListSubItem
                        key={`${groupIndex}-${hookIndex}`}
                        icon={Icon}
                        label={name}
                        selected={isSelected}
                        onClick={() =>
                          onSelectHook({
                            scope,
                            event,
                            groupIndex,
                            hookIndex,
                            hook,
                            matcher: group.matcher,
                          })
                        }
                      />
                    )
                  }),
                )}
              </ListItem>
            )
          })}
        </div>
      )}
    </div>
  )
})

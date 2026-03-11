import { useEffect, useRef, useState } from "react"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { Skeleton } from "@/components/ui/skeleton"
import type { EntityConfig } from "@/config/entity-registry"
import type { EntityActionId } from "@/lib/entity-actions"

interface EntityListPanelProps<T> {
  config: EntityConfig<T>
  items: T[]
  scopeFilter?: string
  selectedKey?: string
  onSelectItem?: (target: unknown) => void
  onAction?: (id: EntityActionId, target: unknown) => void
  /** 아이템별 trailing 위젯 (예: MCP Switch) */
  renderTrailing?: (item: T) => React.ReactNode
  emptyDescription?: string
  /** 로딩 중 Skeleton 표시 */
  isLoading?: boolean
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1 p-1">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-4 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EntityListPanel<T>({
  config,
  items,
  scopeFilter,
  selectedKey,
  onSelectItem,
  onAction,
  renderTrailing,
  emptyDescription,
  isLoading,
}: EntityListPanelProps<T>) {
  const Icon = config.icon

  // --- Loading state ---
  if (isLoading) {
    return <SkeletonList />
  }

  // scopeFilter 적용
  const filtered = scopeFilter
    ? items.filter((item) => config.getScope?.(item) === scopeFilter)
    : items

  // --- Grouped list ---
  if (config.groupBy) {
    return (
      <GroupedList
        config={config}
        items={filtered}
        selectedKey={selectedKey}
        onSelectItem={onSelectItem}
        onAction={onAction}
        renderTrailing={renderTrailing}
        emptyDescription={emptyDescription}
      />
    )
  }

  // --- Empty state ---
  if (filtered.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        {emptyDescription && (
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        )}
      </Empty>
    )
  }

  // --- Flat list ---
  return (
    <div>
      {filtered.map((item) => {
        const key = config.getKey(item)
        const label = config.getLabel(item)
        const description = config.getDescription?.(item)
        const target = config.toDetailTarget(item)
        const resolvedActions = resolveActions(config.actions)

        return (
          <EntityActionContextMenu
            key={key}
            actions={resolvedActions}
            onAction={(id) => onAction?.(id, target)}
            itemName={label}
          >
            <ListItem
              icon={Icon}
              label={label}
              description={description}
              selected={selectedKey === key}
              trailing={
                renderTrailing?.(item) ?? (
                  <EntityActionDropdown
                    actions={resolvedActions}
                    onAction={(id) => onAction?.(id, target)}
                    itemName={label}
                  />
                )
              }
              onClick={() => onSelectItem?.(target)}
            />
          </EntityActionContextMenu>
        )
      })}
    </div>
  )
}

// --- Grouped list sub-component ---

interface GroupedListProps<T> {
  config: EntityConfig<T>
  items: T[]
  selectedKey?: string
  onSelectItem?: (target: unknown) => void
  onAction?: (id: EntityActionId, target: unknown) => void
  renderTrailing?: (item: T) => React.ReactNode
  emptyDescription?: string
}

function GroupedList<T>({
  config,
  items,
  selectedKey,
  onSelectItem,
  onAction,
  renderTrailing,
  emptyDescription,
}: GroupedListProps<T>) {
  const Icon = config.icon

  // groupBy 보장 (상위에서 확인했지만 타입 안전성을 위해)
  // biome-ignore lint/style/noNonNullAssertion: guaranteed by caller (GroupedListProps requires groupBy)
  const groupByFn = config.groupBy!

  // 그룹화
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const groupKey = groupByFn(item)
    const existing = grouped.get(groupKey) ?? []
    existing.push(item)
    grouped.set(groupKey, existing)
  }

  const groupKeys = Array.from(grouped.keys())

  // 확장/축소 상태 — 초기: 모든 그룹 확장
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — stable string key tracks group changes without causing re-init
  useEffect(() => {
    if (!initialized.current && groupKeys.length > 0) {
      initialized.current = true
      setOpenGroups(new Set(groupKeys))
    }
  }, [groupKeys.join(",")])

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // --- Empty state ---
  if (groupKeys.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        {emptyDescription && (
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        )}
      </Empty>
    )
  }

  const resolvedActions = resolveActions(config.actions)

  return (
    <div>
      {groupKeys.map((groupKey) => {
        const groupItems = grouped.get(groupKey) ?? []
        if (groupItems.length === 0) return null

        const isOpen = openGroups.has(groupKey)

        return (
          <ListItem
            key={groupKey}
            icon={Icon}
            label={groupKey}
            open={isOpen}
            onClick={() => toggleGroup(groupKey)}
          >
            {groupItems.map((item) => {
              const key = config.getKey(item)
              const label = config.getLabel(item)
              const target = config.toDetailTarget(item)

              return (
                <EntityActionContextMenu
                  key={key}
                  actions={resolvedActions}
                  onAction={(id) => onAction?.(id, target)}
                  itemName={label}
                >
                  <ListSubItem
                    icon={Icon}
                    label={label}
                    selected={selectedKey === key}
                    trailing={
                      renderTrailing?.(item) ?? (
                        <EntityActionDropdown
                          actions={resolvedActions}
                          onAction={(id) => onAction?.(id, target)}
                          itemName={label}
                        />
                      )
                    }
                    onClick={() => onSelectItem?.(target)}
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

// --- Action resolver ---
// EntityConfig.actions는 EntityActionId[] 이고,
// entity-action-menu는 EntityAction[] 을 받으므로 ENTITY_ACTIONS에서 조회

import type { EntityAction } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"

function resolveActions(actionIds: EntityActionId[]): EntityAction[] {
  // ENTITY_ACTIONS에서 모든 액션을 flat하게 수집해 ID로 조회
  const allActions = new Map<string, EntityAction>()
  for (const actions of Object.values(ENTITY_ACTIONS)) {
    for (const action of actions) {
      allActions.set(action.id, action)
    }
  }
  return actionIds
    .map((id) => allActions.get(id))
    .filter((a): a is EntityAction => a !== undefined)
}

// src/features/dashboard/components/PluginsPanel.tsx
import { ChevronDown } from "lucide-react"
import { type ElementType, useEffect, useMemo, useRef, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { useMcpStatusQuery } from "@/features/mcp-editor/api/mcp.queries"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { titleCase } from "@/lib/format"
import { getMcpIconClass } from "@/lib/mcp-status"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"
import type { McpConnectionStatus, Plugin } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"

interface PluginsPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  /** Even = collapse all, odd = expand all. Changes trigger bulk toggle. */
  collapseSignal?: number
}

export function PluginsPanel({
  scopeFilter,
  onSelectItem,
  onAction,
  collapseSignal = 0,
}: PluginsPanelProps) {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)
  const { data: statusMap } = useMcpStatusQuery()
  const filtered = scopeFilter
    ? plugins.filter((p) => p.scope === scopeFilter)
    : plugins

  const expandableIds = useMemo(
    () => filtered.filter((p) => hasPluginContents(p)).map((p) => p.id),
    [filtered],
  )

  // Default collapsed: all expandable items start collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current && expandableIds.length > 0) {
      initialized.current = true
      setCollapsed(new Set(expandableIds))
    }
  }, [expandableIds])

  // Respond to external collapse signal from header
  const lastSignal = useRef(collapseSignal)
  useEffect(() => {
    if (collapseSignal !== lastSignal.current) {
      lastSignal.current = collapseSignal
      if (collapseSignal % 2 === 0) {
        setCollapsed(new Set(expandableIds))
      } else {
        setCollapsed(new Set())
      }
    }
  }, [collapseSignal, expandableIds])

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expand(id: string) {
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <ENTITY_ICONS.plugin />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_plugins()}</EmptyDescription>
      </Empty>
    )

  return (
    <div className="flex flex-col gap-0.5">
      {filtered.map((plugin) => (
        <PluginTreeItem
          key={plugin.id}
          plugin={plugin}
          expanded={!collapsed.has(plugin.id)}
          onToggle={() => toggle(plugin.id)}
          onExpand={() => expand(plugin.id)}
          onSelectItem={onSelectItem}
          onAction={onAction}
          statusMap={statusMap}
        />
      ))}
    </div>
  )
}

/**
 * Static category label inside a plugin's sub-item list.
 * Renders as <li> since parent uses <ul>.
 */
function CategoryLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: ElementType
  label: string
  count: number
}) {
  return (
    <li className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 first:pt-0.5">
      <Icon className="size-3 shrink-0" />
      {label}
      <span className="font-normal">({count})</span>
    </li>
  )
}

function hasPluginContents(plugin: Plugin): boolean {
  const c = plugin.contents
  if (!c) return false
  return (
    c.skills.length > 0 ||
    c.agents.length > 0 ||
    c.mcpServers.length > 0 ||
    Object.keys(c.hooks ?? {}).length > 0
  )
}

/** Open-only actions for plugin sub-items (plugin-managed, no edit/delete) */
const openOnlyFilter = (a: (typeof ENTITY_ACTIONS)["skill"][number]) =>
  a.id === "open-vscode" || a.id === "open-cursor" || a.id === "open-folder"

function PluginTreeItem({
  plugin,
  expanded,
  onToggle,
  onExpand,
  onSelectItem,
  onAction,
  statusMap,
}: {
  plugin: Plugin
  expanded: boolean
  onToggle: () => void
  onExpand: () => void
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  statusMap?: Record<string, McpConnectionStatus>
}) {
  const contents = plugin.contents
  const skills = contents?.skills ?? []
  const agents = contents?.agents ?? []
  const mcpServers = contents?.mcpServers ?? []
  const hookEntries = Object.entries(contents?.hooks ?? {})

  const hasContents = hasPluginContents(plugin)
  const pluginTarget = { type: "plugin" as const, plugin }

  const trailing = (
    <span className="flex items-center gap-0.5">
      {!plugin.enabled && <Badge variant="secondary">off</Badge>}
      {hasContents && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          <ChevronDown
            className={cn(
              "transition-transform duration-200",
              !expanded && "-rotate-90",
            )}
            data-icon
          />
        </Button>
      )}
      <EntityActionDropdown
        actions={ENTITY_ACTIONS.plugin}
        onAction={(id) => onAction?.(id, pluginTarget)}
        itemName={titleCase(plugin.name)}
      />
    </span>
  )

  const description = plugin.description ?? undefined

  // No sub-items: simple ListItem
  if (!hasContents) {
    return (
      <EntityActionContextMenu
        actions={ENTITY_ACTIONS.plugin}
        onAction={(id) => onAction?.(id, pluginTarget)}
        itemName={titleCase(plugin.name)}
      >
        <ListItem
          icon={ENTITY_ICONS.plugin}
          label={titleCase(plugin.name)}
          description={description}
          iconClassName={
            !plugin.enabled ? "text-muted-foreground/50" : undefined
          }
          trailing={trailing}
          onClick={() => onSelectItem?.(pluginTarget)}
        />
      </EntityActionContextMenu>
    )
  }

  // Has sub-items: Collapsible managed externally
  // Click expands if collapsed + opens detail panel
  return (
    <Collapsible open={expanded}>
      <EntityActionContextMenu
        actions={ENTITY_ACTIONS.plugin}
        onAction={(id) => onAction?.(id, pluginTarget)}
        itemName={titleCase(plugin.name)}
      >
        <ListItem
          icon={ENTITY_ICONS.plugin}
          label={titleCase(plugin.name)}
          description={description}
          iconClassName={
            !plugin.enabled ? "text-muted-foreground/50" : undefined
          }
          trailing={trailing}
          onClick={() => {
            onExpand()
            onSelectItem?.(pluginTarget)
          }}
        />
      </EntityActionContextMenu>
      <CollapsibleContent>
        <ul className="ml-3.5 flex list-none flex-col gap-0.5 border-l border-border/50 pl-2.5 py-0.5">
          {skills.length > 0 && (
            <>
              <CategoryLabel
                icon={ENTITY_ICONS.skill}
                label="Skills"
                count={skills.length}
              />
              {skills.map((s) => {
                const t = { type: "skill" as const, skill: s }
                const acts = ENTITY_ACTIONS.skill.filter(openOnlyFilter)
                return (
                  <EntityActionContextMenu
                    key={s.name}
                    actions={acts}
                    onAction={(id) => onAction?.(id, t)}
                    itemName={s.frontmatter?.name ?? s.name}
                  >
                    <ListSubItem
                      icon={ENTITY_ICONS.skill}
                      label={s.frontmatter?.name ?? s.name}
                      trailing={
                        <EntityActionDropdown
                          actions={acts}
                          onAction={(id) => onAction?.(id, t)}
                          itemName={s.frontmatter?.name ?? s.name}
                        />
                      }
                      onClick={() => onSelectItem?.(t)}
                    />
                  </EntityActionContextMenu>
                )
              })}
            </>
          )}

          {agents.length > 0 && (
            <>
              <CategoryLabel
                icon={ENTITY_ICONS.agent}
                label="Agents"
                count={agents.length}
              />
              {agents.map((a) => {
                const t = { type: "agent" as const, agent: a }
                const acts = ENTITY_ACTIONS.agent.filter(openOnlyFilter)
                return (
                  <EntityActionContextMenu
                    key={a.name}
                    actions={acts}
                    onAction={(id) => onAction?.(id, t)}
                    itemName={a.frontmatter?.name ?? a.name}
                  >
                    <ListSubItem
                      icon={ENTITY_ICONS.agent}
                      label={a.name}
                      trailing={
                        <EntityActionDropdown
                          actions={acts}
                          onAction={(id) => onAction?.(id, t)}
                          itemName={a.frontmatter?.name ?? a.name}
                        />
                      }
                      onClick={() => onSelectItem?.(t)}
                    />
                  </EntityActionContextMenu>
                )
              })}
            </>
          )}

          {mcpServers.length > 0 && (
            <>
              <CategoryLabel
                icon={ENTITY_ICONS.mcp}
                label="MCP Servers"
                count={mcpServers.length}
              />
              {mcpServers.map((s) => {
                const t = { type: "mcp" as const, server: s }
                const acts = ENTITY_ACTIONS.mcp.filter(openOnlyFilter)
                return (
                  <EntityActionContextMenu
                    key={s.name}
                    actions={acts}
                    onAction={(id) => onAction?.(id, t)}
                    itemName={s.name}
                  >
                    <ListSubItem
                      icon={ENTITY_ICONS.mcp}
                      iconClassName={getMcpIconClass(s, statusMap)}
                      label={s.name}
                      trailing={
                        <EntityActionDropdown
                          actions={acts}
                          onAction={(id) => onAction?.(id, t)}
                          itemName={s.name}
                        />
                      }
                      onClick={() => onSelectItem?.(t)}
                    />
                  </EntityActionContextMenu>
                )
              })}
            </>
          )}

          {hookEntries.length > 0 && (
            <>
              <CategoryLabel
                icon={ENTITY_ICONS.hook}
                label="Hooks"
                count={hookEntries.length}
              />
              {hookEntries.map(([event, groups]) => {
                const firstHook = groups?.[0]?.hooks?.[0]
                const firstMatcher = groups?.[0]?.matcher
                if (!firstHook) return null
                const t = {
                  type: "hook" as const,
                  hook: firstHook,
                  event,
                  matcher: firstMatcher,
                }
                return (
                  <ListSubItem
                    key={event}
                    icon={ENTITY_ICONS.hook}
                    label={event}
                    onClick={() => onSelectItem?.(t)}
                  />
                )
              })}
            </>
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

// src/features/dashboard/components/PluginsPanel.tsx
import { type ElementType, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
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
import type { McpConnectionStatus, Plugin } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface PluginsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  href?: string
}

export function PluginsPanel({
  onSelectItem,
  onAction,
  href,
}: PluginsPanelProps) {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)
  const { data: statusMap } = useMcpStatusQuery()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const allCollapsed =
    plugins.length > 0 && plugins.every((p) => collapsed.has(p.id))

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(plugins.map((p) => p.id)))
  }

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const actions = (
    <button
      type="button"
      onClick={toggleAll}
      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {allCollapsed ? "Expand all" : "Collapse all"}
    </button>
  )

  return (
    <OverviewPanel
      title="Plugins"
      count={plugins.length}
      actions={actions}
      href={href}
    >
      {plugins.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No plugins</p>
      ) : (
        <div className="space-y-0.5">
          {groupByScope(plugins).map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((plugin) => (
                <PluginTreeItem
                  key={plugin.id}
                  plugin={plugin}
                  expanded={!collapsed.has(plugin.id)}
                  onToggle={() => toggle(plugin.id)}
                  onSelectItem={onSelectItem}
                  onAction={onAction}
                  statusMap={statusMap}
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

/**
 * Static category label inside a ListItem's <ul> children.
 * Must render as <li> since parent ListItem uses <ul>.
 * Styled like ScopeGroup but within a list context.
 * NO chevron, NO collapse — consistent with all other dashboard panels.
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
    <li className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5 first:pt-0.5">
      <Icon className="size-3 shrink-0" />
      {label}
      <span className="font-normal">({count})</span>
    </li>
  )
}

function pluginContentSummary(plugin: Plugin): string | null {
  const contents = plugin.contents
  if (!contents) return null
  const parts: string[] = []
  if (contents.skills.length > 0) parts.push(`${contents.skills.length}S`)
  if (contents.agents.length > 0) parts.push(`${contents.agents.length}A`)
  if (contents.mcpServers.length > 0)
    parts.push(`${contents.mcpServers.length}M`)
  const hookCount = Object.keys(contents.hooks ?? {}).length
  if (hookCount > 0) parts.push(`${hookCount}H`)
  return parts.length > 0 ? parts.join(" · ") : null
}

/** Open-only actions for plugin sub-items (plugin-managed, no edit/delete) */
const openOnlyFilter = (a: (typeof ENTITY_ACTIONS)["skill"][number]) =>
  a.id === "open-vscode" || a.id === "open-cursor" || a.id === "open-folder"

function PluginTreeItem({
  plugin,
  expanded,
  onToggle,
  onSelectItem,
  onAction,
  statusMap,
}: {
  plugin: Plugin
  expanded: boolean
  onToggle: () => void
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

  const hasContents =
    skills.length > 0 ||
    agents.length > 0 ||
    mcpServers.length > 0 ||
    hookEntries.length > 0

  const pluginTarget = { type: "plugin" as const, plugin }

  const summary = pluginContentSummary(plugin)
  const trailing = (
    <span className="flex items-center gap-1.5">
      {summary && (
        <span className="text-[10px] text-muted-foreground">{summary}</span>
      )}
      {!plugin.enabled && (
        <span className="text-[10px] text-muted-foreground/40">off</span>
      )}
      <EntityActionDropdown
        actions={ENTITY_ACTIONS.plugin}
        onAction={(id) => onAction?.(id, pluginTarget)}
        itemName={titleCase(plugin.name)}
      />
    </span>
  )

  // No sub-items: simple ListItem, click shows plugin detail
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
          iconClassName={
            !plugin.enabled ? "text-muted-foreground/50" : undefined
          }
          trailing={trailing}
          onClick={() => onSelectItem?.(pluginTarget)}
        />
      </EntityActionContextMenu>
    )
  }

  // Has sub-items: ListItem collapsible (no explicit chevron — same as all other panels).
  // Clicking toggles expand/collapse AND shows plugin detail.
  return (
    <EntityActionContextMenu
      actions={ENTITY_ACTIONS.plugin}
      onAction={(id) => onAction?.(id, pluginTarget)}
      itemName={titleCase(plugin.name)}
    >
      <ListItem
        icon={ENTITY_ICONS.plugin}
        label={titleCase(plugin.name)}
        iconClassName={!plugin.enabled ? "text-muted-foreground/50" : undefined}
        trailing={trailing}
        open={expanded}
        onClick={() => {
          onToggle()
          onSelectItem?.(pluginTarget)
        }}
      >
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
      </ListItem>
    </EntityActionContextMenu>
  )
}

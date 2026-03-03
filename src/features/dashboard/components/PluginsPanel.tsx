// src/features/dashboard/components/PluginsPanel.tsx
import { type ElementType, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { useMcpStatusQuery } from "@/features/mcp-editor/api/mcp.queries"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { titleCase } from "@/lib/format"
import { getMcpIconClass } from "@/lib/mcp-status"
import type { McpConnectionStatus, Plugin } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface PluginsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  href?: string
}

export function PluginsPanel({ onSelectItem, href }: PluginsPanelProps) {
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

function PluginTreeItem({
  plugin,
  expanded,
  onToggle,
  onSelectItem,
  statusMap,
}: {
  plugin: Plugin
  expanded: boolean
  onToggle: () => void
  onSelectItem?: (target: DashboardDetailTarget) => void
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

  const summary = pluginContentSummary(plugin)
  const trailing = (
    <span className="flex items-center gap-1.5">
      {summary && (
        <span className="text-[10px] text-muted-foreground">{summary}</span>
      )}
      {!plugin.enabled && (
        <span className="text-[10px] text-muted-foreground/40">off</span>
      )}
    </span>
  )

  // No sub-items: simple ListItem, click shows plugin detail
  if (!hasContents) {
    return (
      <ListItem
        icon={ENTITY_ICONS.plugin}
        label={titleCase(plugin.name)}
        iconClassName={!plugin.enabled ? "text-muted-foreground/50" : undefined}
        trailing={trailing}
        onClick={() => onSelectItem?.({ type: "plugin", plugin })}
      />
    )
  }

  // Has sub-items: ListItem collapsible (no explicit chevron — same as all other panels).
  // Clicking toggles expand/collapse AND shows plugin detail.
  return (
    <ListItem
      icon={ENTITY_ICONS.plugin}
      label={titleCase(plugin.name)}
      iconClassName={!plugin.enabled ? "text-muted-foreground/50" : undefined}
      trailing={trailing}
      open={expanded}
      onClick={() => {
        onToggle()
        onSelectItem?.({ type: "plugin", plugin })
      }}
    >
      {skills.length > 0 && (
        <>
          <CategoryLabel
            icon={ENTITY_ICONS.skill}
            label="Skills"
            count={skills.length}
          />
          {skills.map((s) => (
            <ListSubItem
              key={s.name}
              icon={ENTITY_ICONS.skill}
              label={s.frontmatter?.name ?? s.name}
              onClick={() => onSelectItem?.({ type: "skill", skill: s })}
            />
          ))}
        </>
      )}

      {agents.length > 0 && (
        <>
          <CategoryLabel
            icon={ENTITY_ICONS.agent}
            label="Agents"
            count={agents.length}
          />
          {agents.map((a) => (
            <ListSubItem
              key={a.name}
              icon={ENTITY_ICONS.agent}
              label={a.name}
              onClick={() => onSelectItem?.({ type: "agent", agent: a })}
            />
          ))}
        </>
      )}

      {mcpServers.length > 0 && (
        <>
          <CategoryLabel
            icon={ENTITY_ICONS.mcp}
            label="MCP Servers"
            count={mcpServers.length}
          />
          {mcpServers.map((s) => (
            <ListSubItem
              key={s.name}
              icon={ENTITY_ICONS.mcp}
              iconClassName={getMcpIconClass(s, statusMap)}
              label={s.name}
              onClick={() => onSelectItem?.({ type: "mcp", server: s })}
            />
          ))}
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
            return (
              <ListSubItem
                key={event}
                icon={ENTITY_ICONS.hook}
                label={event}
                onClick={() =>
                  firstHook &&
                  onSelectItem?.({
                    type: "hook",
                    hook: firstHook,
                    event,
                    matcher: firstMatcher,
                  })
                }
              />
            )
          })}
        </>
      )}
    </ListItem>
  )
}

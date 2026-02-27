// src/features/dashboard/components/PluginsPanel.tsx
import {
  ChevronDown,
  ChevronRight,
  Plug2Icon,
  ScrollText,
  Server,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import { titleCase } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Plugin } from "@/shared/types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

export function PluginsPanel() {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)
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
    <OverviewPanel title="Plugins" count={plugins.length} actions={actions}>
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
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

function PluginTreeItem({
  plugin,
  expanded,
  onToggle,
}: {
  plugin: Plugin
  expanded: boolean
  onToggle: () => void
}) {
  const contents = plugin.contents
  const skillCount = contents?.skills?.length ?? 0
  const mcpCount = contents?.mcpServers?.length ?? 0
  const hookCount = contents?.hooks
    ? Object.values(contents.hooks).reduce<number>(
        (n, groups) =>
          n + (groups ?? []).reduce((m, g) => m + g.hooks.length, 0),
        0,
      )
    : 0
  const hasContents = skillCount > 0 || mcpCount > 0 || hookCount > 0

  return (
    <div>
      <button
        type="button"
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="size-3 shrink-0 flex items-center">
          {hasContents ? (
            expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )
          ) : null}
        </span>
        <Plug2Icon className="size-3 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "truncate",
            !plugin.enabled && "text-muted-foreground/50",
          )}
        >
          {titleCase(plugin.name)}
        </span>
        {!plugin.enabled && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0">
            off
          </span>
        )}
      </button>

      {expanded && hasContents && (
        <div className="ml-6 space-y-0.5 pb-0.5">
          {skillCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <ScrollText className="size-3 shrink-0" />
              Skills ({skillCount})
            </div>
          )}
          {mcpCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Server className="size-3 shrink-0" />
              MCP: {contents?.mcpServers?.map((s) => s.name).join(", ")}
            </div>
          )}
          {hookCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Zap className="size-3 shrink-0" />
              Hooks ({hookCount})
            </div>
          )}
        </div>
      )}
    </div>
  )
}

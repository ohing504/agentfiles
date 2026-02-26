import { useMemo } from "react"
import { ListItem } from "@/components/ui/list-item"
import { m } from "@/paraglide/messages"
import type { AgentFile, PluginComponents } from "@/shared/types"
import { PLUGIN_COMPONENT_META } from "../constants"
import type { PluginComponentType } from "../types"

// Unified item type for the list
export interface ComponentItem {
  id: string
  label: string
  tooltip?: string
}

function agentFileToItem(f: AgentFile): ComponentItem {
  return {
    id: f.path ?? f.name,
    label: f.name,
    tooltip: f.frontmatter?.description
      ? String(f.frontmatter.description)
      : undefined,
  }
}

export function getComponentItems(
  contents: PluginComponents,
  componentType: PluginComponentType,
): ComponentItem[] {
  switch (componentType) {
    case "commands":
    case "skills":
    case "agents":
    case "outputStyles":
      return contents[componentType].map(agentFileToItem)
    case "hooks": {
      const hooks = contents.hooks
      const items: ComponentItem[] = []
      for (const [event, groups] of Object.entries(hooks)) {
        if (!Array.isArray(groups)) continue
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi]
          for (let hi = 0; hi < group.hooks.length; hi++) {
            const hook = group.hooks[hi]
            const tooltipLines = [
              `Event: ${event}`,
              group.matcher ? `Matcher: ${group.matcher}` : null,
              hook.command
                ? `Command: ${hook.command}`
                : hook.prompt
                  ? `Prompt: ${hook.prompt.slice(0, 80)}`
                  : null,
            ].filter(Boolean)
            items.push({
              id: `${event}-${gi}-${hi}`,
              label: event,
              tooltip: tooltipLines.join("\n"),
            })
          }
        }
      }
      return items
    }
    case "mcpServers": {
      const servers = contents.mcpServers
      return servers.map((s) => ({
        id: s.name,
        label: s.name,
        tooltip: s.type,
      }))
    }
    case "lspServers": {
      const servers = contents.lspServers
      return servers.map((s) => ({
        id: s.name,
        label: s.name,
        tooltip: s.command,
      }))
    }
    default:
      return []
  }
}

export function PluginComponentList({
  contents,
  componentType,
  selectedItemId,
  onSelectItem,
}: {
  contents: PluginComponents
  componentType: PluginComponentType
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
}) {
  const meta = PLUGIN_COMPONENT_META[componentType]
  const items = useMemo(
    () => getComponentItems(contents, componentType),
    [contents, componentType],
  )

  return (
    <div className="w-[260px] shrink-0 border-r border-border flex flex-col">
      <div className="flex items-center gap-2 px-4 h-12 shrink-0">
        <meta.icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{meta.labelFn()}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2">
            {m.plugin_no_items()}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <ListItem
                key={item.id}
                icon={meta.icon}
                label={item.label}
                tooltip={item.tooltip}
                selected={selectedItemId === item.id}
                onClick={() => onSelectItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

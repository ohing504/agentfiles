import { useMemo } from "react"
import { ListItem } from "@/components/ui/list-item"
import type { PluginComponents } from "@/shared/types"
import { PLUGIN_COMPONENT_META } from "../constants"
import type { PluginComponentType } from "../types"

// Unified item type for the list
export interface ComponentItem {
  id: string
  label: string
  tooltip?: string
}

export function getComponentItems(
  contents: PluginComponents,
  componentType: PluginComponentType,
): ComponentItem[] {
  switch (componentType) {
    case "commands": {
      const files = contents.commands
      return files.map((f) => ({
        id: f.path ?? f.name,
        label: f.name,
        tooltip: f.frontmatter?.description
          ? String(f.frontmatter.description)
          : undefined,
      }))
    }
    case "skills": {
      const files = contents.skills
      return files.map((f) => ({
        id: f.path ?? f.name,
        label: f.name,
        tooltip: f.frontmatter?.description
          ? String(f.frontmatter.description)
          : undefined,
      }))
    }
    case "agents": {
      const files = contents.agents
      return files.map((f) => ({
        id: f.path ?? f.name,
        label: f.name,
        tooltip: f.frontmatter?.description
          ? String(f.frontmatter.description)
          : undefined,
      }))
    }
    case "outputStyles": {
      const files = contents.outputStyles
      return files.map((f) => ({
        id: f.path ?? f.name,
        label: f.name,
        tooltip: f.frontmatter?.description
          ? String(f.frontmatter.description)
          : undefined,
      }))
    }
    case "hooks": {
      const hooks = contents.hooks
      const items: ComponentItem[] = []
      for (const [event, groups] of Object.entries(hooks)) {
        if (!Array.isArray(groups)) continue
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi]
          for (let hi = 0; hi < group.hooks.length; hi++) {
            const hook = group.hooks[hi]
            items.push({
              id: `${event}-${gi}-${hi}`,
              label: hook.command ?? hook.prompt?.slice(0, 40) ?? event,
              tooltip: group.matcher ? `${event} [${group.matcher}]` : event,
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
          <p className="text-xs text-muted-foreground px-2">No items</p>
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

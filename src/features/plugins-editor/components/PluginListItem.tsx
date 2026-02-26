import { Plug2Icon } from "lucide-react"
import { memo } from "react"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { titleCase } from "@/lib/format"
import { m } from "@/paraglide/messages"
import type { Plugin, PluginComponents } from "@/shared/types"
import { getNonEmptyComponents, PLUGIN_COMPONENT_META } from "../constants"
import type { PluginComponentType } from "../types"

export const PluginListItem = memo(function PluginListItem({
  plugin,
  isSelected,
  selectedComponentType,
  showSource,
  onSelect,
  onSelectComponentType,
}: {
  plugin: Plugin
  isSelected: boolean
  selectedComponentType: PluginComponentType | null
  showSource?: boolean
  onSelect: (plugin: Plugin) => void
  onSelectComponentType: (
    plugin: Plugin,
    componentType: PluginComponentType,
  ) => void
}) {
  const componentTypes = getNonEmptyComponents(plugin.contents)

  const sourceName = plugin.marketplace ?? plugin.scope

  const label = titleCase(plugin.name)
  const description = showSource && sourceName ? sourceName : undefined
  const trailing = !plugin.enabled ? (
    <span className="text-[10px] text-muted-foreground/60">
      {m.plugin_disabled()}
    </span>
  ) : undefined
  const tooltip = sourceName || undefined

  if (componentTypes.length === 0) {
    return (
      <ListItem
        icon={Plug2Icon}
        label={label}
        description={description}
        trailing={trailing}
        tooltip={tooltip}
        selected={isSelected && !selectedComponentType}
        onClick={() => onSelect(plugin)}
      />
    )
  }

  return (
    <ListItem
      icon={Plug2Icon}
      label={label}
      description={description}
      trailing={trailing}
      tooltip={tooltip}
      selected={isSelected && !selectedComponentType}
      open={isSelected}
      onClick={() => onSelect(plugin)}
    >
      {componentTypes.map((compType) => {
        const meta = PLUGIN_COMPONENT_META[compType]
        const items = plugin.contents?.[compType as keyof PluginComponents]
        const count = Array.isArray(items)
          ? items.length
          : typeof items === "object" && items !== null
            ? Object.keys(items).length
            : 0
        return (
          <ListSubItem
            key={compType}
            icon={meta.icon}
            label={meta.labelFn()}
            trailing={
              <span className="text-[10px] text-muted-foreground/60">
                {count}
              </span>
            }
            selected={isSelected && selectedComponentType === compType}
            onClick={() => onSelectComponentType(plugin, compType)}
          />
        )
      })}
    </ListItem>
  )
})

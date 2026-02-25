import { useState } from "react"
import { DetailField } from "@/components/DetailField"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { m } from "@/paraglide/messages"
import type { Plugin, PluginComponents } from "@/shared/types"
import { PLUGIN_COMPONENT_META, PLUGIN_COMPONENT_ORDER } from "../constants"
import type { PluginComponentType } from "../types"

const MAX_VISIBLE_ITEMS = 8

interface ItemInfo {
  id: string
  name: string
  description?: string
}

function agentFilesToItems(files: PluginComponents["commands"]): ItemInfo[] {
  return files.map((f) => ({
    id: f.path ?? f.name,
    name: f.name,
    description: f.frontmatter?.description
      ? String(f.frontmatter.description)
      : undefined,
  }))
}

function getItems(
  contents: PluginComponents,
  componentType: PluginComponentType,
): ItemInfo[] {
  switch (componentType) {
    case "commands":
      return agentFilesToItems(contents.commands)
    case "skills":
      return agentFilesToItems(contents.skills)
    case "agents":
      return agentFilesToItems(contents.agents)
    case "outputStyles":
      return agentFilesToItems(contents.outputStyles)
    case "hooks":
      return Object.entries(contents.hooks).flatMap(([eventName, groups]) => {
        if (!Array.isArray(groups) || groups.length === 0) return []
        const matchers = groups
          .map((g: { matcher?: string }) => g.matcher)
          .filter(Boolean)
        const name =
          matchers.length > 0
            ? `${eventName}: ${matchers.join("|")}`
            : eventName
        return [{ id: `${eventName}-0-0`, name }]
      })
    case "mcpServers":
      return contents.mcpServers.map((s) => ({ id: s.name, name: s.name }))
    case "lspServers":
      return contents.lspServers.map((s) => ({ id: s.name, name: s.name }))
    default:
      return []
  }
}

function ItemBadge({ item, onClick }: { item: ItemInfo; onClick: () => void }) {
  const button = (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className="rounded-full cursor-pointer"
    >
      {item.name}
    </Button>
  )

  if (!item.description) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{item.description}</TooltipContent>
    </Tooltip>
  )
}

function ComponentSection({
  componentType,
  contents,
  onSelectItem,
  onSelectComponentType,
}: {
  componentType: PluginComponentType
  contents: PluginComponents
  onSelectItem: (componentType: PluginComponentType, itemId: string) => void
  onSelectComponentType: (componentType: PluginComponentType) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = PLUGIN_COMPONENT_META[componentType]
  const items = getItems(contents, componentType)
  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, MAX_VISIBLE_ITEMS)
  const remaining = items.length - MAX_VISIBLE_ITEMS

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline"
          onClick={() => onSelectComponentType(componentType)}
        >
          {meta.labelFn()}
        </button>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {items.length}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{meta.descriptionFn()}</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => (
          <ItemBadge
            key={item.id}
            item={item}
            onClick={() => onSelectItem(componentType, item.id)}
          />
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground self-start"
        >
          {m.plugin_show_more({ count: String(remaining) })}
        </button>
      )}
    </div>
  )
}

export function PluginOverview({
  plugin,
  onSelectComponentType,
  onSelectItem,
}: {
  plugin: Plugin
  onSelectComponentType: (componentType: PluginComponentType) => void
  onSelectItem: (componentType: PluginComponentType, itemId: string) => void
}) {
  const contents = plugin.contents

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
      {/* Metadata */}
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <DetailField label={m.plugin_source()}>
          <span className="text-sm font-medium">
            {plugin.marketplace
              ? m.plugin_source_marketplace({
                  name: plugin.marketplace,
                })
              : m.plugin_source_local()}
          </span>
        </DetailField>

        {plugin.author?.name && (
          <DetailField label={m.plugin_author()}>
            <span className="text-sm font-medium">{plugin.author.name}</span>
          </DetailField>
        )}

        {plugin.version && (
          <DetailField label={m.plugin_version()}>
            <span className="text-sm font-medium">{plugin.version}</span>
          </DetailField>
        )}
      </div>

      {/* Description */}
      {plugin.description && (
        <DetailField label={m.plugin_description()}>
          <p className="text-sm text-foreground">{plugin.description}</p>
        </DetailField>
      )}

      {/* Component Sections */}
      {contents &&
        PLUGIN_COMPONENT_ORDER.map((compType) => (
          <ComponentSection
            key={compType}
            componentType={compType}
            contents={contents}
            onSelectComponentType={onSelectComponentType}
            onSelectItem={onSelectItem}
          />
        ))}
    </div>
  )
}

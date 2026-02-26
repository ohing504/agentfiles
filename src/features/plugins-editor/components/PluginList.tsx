import { useMemo } from "react"
import type { Plugin } from "@/shared/types"
import { usePluginsSelection } from "../context/PluginsContext"
import { PluginListItem } from "./PluginListItem"

/** Left-panel list content — rendered inside the scrollable panel 1 container */
export function PluginList({ searchQuery }: { searchQuery: string }) {
  const {
    groupedByScope,
    duplicateNames,
    selectedPlugin,
    selectedComponentType,
    handleSelectPlugin,
    handleSelectComponentType,
  } = usePluginsSelection()

  const filteredByScope = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groupedByScope
    const result = new Map<string, Plugin[]>()
    for (const [label, group] of groupedByScope) {
      const filtered = group.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description ?? "").toLowerCase().includes(query),
      )
      if (filtered.length > 0) result.set(label, filtered)
    }
    return result
  }, [groupedByScope, searchQuery])

  if (groupedByScope.size === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-1.5">
        No plugins installed
      </p>
    )
  }

  if (filteredByScope.size === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-1.5">No results</p>
    )
  }

  return (
    <>
      {[...filteredByScope.entries()].map(([scopeLabel, pluginGroup]) => (
        <div key={scopeLabel}>
          <div className="flex items-center justify-between h-8 px-2">
            <span className="text-xs font-medium text-muted-foreground">
              {scopeLabel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {pluginGroup.map((plugin) => (
              <PluginListItem
                key={plugin.id}
                plugin={plugin}
                isSelected={selectedPlugin?.id === plugin.id}
                selectedComponentType={
                  selectedPlugin?.id === plugin.id
                    ? selectedComponentType
                    : null
                }
                showSource={duplicateNames.has(plugin.name)}
                onSelect={handleSelectPlugin}
                onSelectComponentType={handleSelectComponentType}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useProjectContext } from "@/components/ProjectContext"
import type { Plugin } from "@/shared/types"
import { usePluginsQuery } from "../api/plugins.queries"
import { getComponentItems } from "../components/PluginComponentList"
import { SCOPE_LABELS, SCOPE_ORDER } from "../constants"
import type { PluginComponentType } from "../types"

export interface PluginsContextValue {
  selectedPlugin: Plugin | null
  selectedPluginId: string | null
  setSelectedPluginId: (id: string | null) => void
  selectedComponentType: PluginComponentType | null
  setSelectedComponentType: (c: PluginComponentType | null) => void
  selectedItemId: string | null
  setSelectedItemId: (id: string | null) => void
  handleSelectPlugin: (plugin: Plugin) => void
  handleSelectComponentType: (
    plugin: Plugin,
    componentType: PluginComponentType,
  ) => void
  groupedByScope: Map<string, Plugin[]>
  duplicateNames: Set<string>
  plugins: Plugin[] | undefined
}

const PluginsContext = createContext<PluginsContextValue | null>(null)

export function usePluginsSelection(): PluginsContextValue {
  const ctx = useContext(PluginsContext)
  if (!ctx) {
    throw new Error("usePluginsSelection must be used within PluginsProvider")
  }
  return ctx
}

export function PluginsProvider({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  const { activeProjectPath } = useProjectContext()
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [selectedComponentType, setSelectedComponentType] =
    useState<PluginComponentType | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const { data: plugins } = usePluginsQuery(activeProjectPath ?? undefined)

  const selectedPlugin = useMemo(
    () => plugins?.find((p) => p.id === selectedPluginId) ?? null,
    [plugins, selectedPluginId],
  )

  // Auto-clear selection when selected plugin disappears from data (e.g., after uninstall)
  useEffect(() => {
    if (
      selectedPluginId &&
      plugins &&
      !plugins.some((p) => p.id === selectedPluginId)
    ) {
      setSelectedPluginId(null)
      setSelectedComponentType(null)
      setSelectedItemId(null)
    }
  }, [plugins, selectedPluginId])

  const groupedByScope = useMemo(() => {
    if (!plugins) return new Map<string, Plugin[]>()
    const map = new Map<string, Plugin[]>()
    for (const scope of SCOPE_ORDER) {
      const group = plugins.filter((p) => p.scope === scope)
      if (group.length > 0) {
        map.set(SCOPE_LABELS[scope], group)
      }
    }
    return map
  }, [plugins])

  const duplicateNames = useMemo(() => {
    if (!plugins) return new Set<string>()
    const counts = new Map<string, number>()
    for (const p of plugins) {
      counts.set(p.name, (counts.get(p.name) ?? 0) + 1)
    }
    return new Set(
      [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n),
    )
  }, [plugins])

  const handleSelectPlugin = useCallback(
    (plugin: Plugin) => {
      setSelectedPluginId(plugin.id)
      setSelectedComponentType(null)
      setSelectedItemId(null)
      onSelect?.()
    },
    [onSelect],
  )

  const handleSelectComponentType = useCallback(
    (plugin: Plugin, componentType: PluginComponentType) => {
      setSelectedPluginId(plugin.id)
      setSelectedComponentType(componentType)
      if (plugin.contents) {
        const firstItem = getComponentItems(plugin.contents, componentType)[0]
        setSelectedItemId(firstItem?.id ?? null)
      } else {
        setSelectedItemId(null)
      }
      onSelect?.()
    },
    [onSelect],
  )

  const value = useMemo(
    () => ({
      selectedPlugin,
      selectedPluginId,
      setSelectedPluginId,
      selectedComponentType,
      setSelectedComponentType,
      selectedItemId,
      setSelectedItemId,
      handleSelectPlugin,
      handleSelectComponentType,
      groupedByScope,
      duplicateNames,
      plugins,
    }),
    [
      selectedPlugin,
      selectedPluginId,
      selectedComponentType,
      selectedItemId,
      handleSelectPlugin,
      handleSelectComponentType,
      groupedByScope,
      duplicateNames,
      plugins,
    ],
  )

  return (
    <PluginsContext.Provider value={value}>{children}</PluginsContext.Provider>
  )
}

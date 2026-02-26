import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { McpServer, Scope } from "@/shared/types"
import { useMcpQuery } from "../api/mcp.queries"

interface McpContextValue {
  servers: McpServer[] | undefined
  isLoading: boolean

  globalServers: McpServer[]
  projectServers: McpServer[]

  selectedServer: McpServer | null
  handleSelectServer: (name: string, scope: Scope) => void
  handleClearSelection: () => void

  addDialogOpen: boolean
  addDialogScope: Scope
  handleAddClick: (scope: Scope) => void
  handleAddClose: () => void

  editingServer: McpServer | null
  setEditingServer: (server: McpServer | null) => void
}

const McpContext = createContext<McpContextValue | null>(null)

function makeId(name: string, scope: Scope) {
  return `${name}::${scope}`
}

export function McpProvider({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect?: () => void
}) {
  const { data: servers, isLoading } = useMcpQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)

  // Stale selection cleanup
  useEffect(() => {
    if (selectedId && servers) {
      const [name, scope] = selectedId.split("::")
      if (!servers.some((s) => s.name === name && s.scope === scope)) {
        setSelectedId(null)
      }
    }
  }, [servers, selectedId])

  const globalServers = useMemo(
    () => (servers ?? []).filter((s) => s.scope === "global"),
    [servers],
  )
  const projectServers = useMemo(
    () => (servers ?? []).filter((s) => s.scope === "project"),
    [servers],
  )

  const selectedServer = useMemo(() => {
    if (!selectedId || !servers) return null
    const [name, scope] = selectedId.split("::")
    return servers.find((s) => s.name === name && s.scope === scope) ?? null
  }, [servers, selectedId])

  const handleSelectServer = useCallback(
    (name: string, scope: Scope) => {
      setSelectedId(makeId(name, scope))
      onSelect?.()
    },
    [onSelect],
  )

  const handleClearSelection = useCallback(() => setSelectedId(null), [])

  const handleAddClick = useCallback((scope: Scope) => {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }, [])

  const handleAddClose = useCallback(() => setAddDialogOpen(false), [])

  const value = useMemo<McpContextValue>(
    () => ({
      servers,
      isLoading,
      globalServers,
      projectServers,
      selectedServer,
      handleSelectServer,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
      editingServer,
      setEditingServer,
    }),
    [
      servers,
      isLoading,
      globalServers,
      projectServers,
      selectedServer,
      handleSelectServer,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
      editingServer,
    ],
  )

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>
}

export function useMcpSelection() {
  const ctx = useContext(McpContext)
  if (!ctx) throw new Error("useMcpSelection must be used within McpProvider")
  return ctx
}

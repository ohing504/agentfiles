import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { AgentFile, Scope } from "@/shared/types"
import { useAgentsQuery } from "../api/agents.queries"

export interface AgentsContextValue {
  agents: AgentFile[] | undefined
  selectedAgent: AgentFile | null
  handleSelectAgent: (agent: AgentFile) => void
  handleClearSelection: () => void
  addDialogOpen: boolean
  addDialogScope: Scope
  handleAddClick: (scope: Scope) => void
  handleAddClose: () => void
}

const AgentsContext = createContext<AgentsContextValue | null>(null)

export function useAgentsSelection(): AgentsContextValue {
  const ctx = useContext(AgentsContext)
  if (!ctx) {
    throw new Error("useAgentsSelection must be used within AgentsProvider")
  }
  return ctx
}

export function AgentsProvider({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

  const { data: agents } = useAgentsQuery()

  // Auto-clear stale selection when agent disappears (e.g., after delete)
  useEffect(() => {
    if (
      selectedAgent &&
      agents &&
      !agents.some((a) => a.path === selectedAgent.path)
    ) {
      setSelectedAgent(null)
    }
  }, [agents, selectedAgent])

  const handleSelectAgent = useCallback(
    (agent: AgentFile) => {
      setSelectedAgent(agent)
      onSelect?.()
    },
    [onSelect],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedAgent(null)
  }, [])

  const handleAddClick = useCallback((scope: Scope) => {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }, [])

  const handleAddClose = useCallback(() => setAddDialogOpen(false), [])

  const value = useMemo(
    () => ({
      agents,
      selectedAgent,
      handleSelectAgent,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    }),
    [
      agents,
      selectedAgent,
      handleSelectAgent,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    ],
  )

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  )
}

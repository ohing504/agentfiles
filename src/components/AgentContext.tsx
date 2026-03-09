import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext } from "react"
import type { AgentConfig, AgentType } from "@/shared/types"

interface AgentContextValue {
  mainAgent: AgentType
  mainAgentConfig: AgentConfig | undefined
  installedAgents: AgentConfig[]
  setMainAgent: (agent: AgentType) => void
  isLoading: boolean
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const { data: mainAgent = "claude-code", isLoading: isLoadingAgent } =
    useQuery({
      queryKey: ["mainAgent"],
      queryFn: async () => {
        const { getMainAgentFn } = await import("@/server/agent-config")
        return getMainAgentFn()
      },
    })

  const { data: installedAgents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ["installedAgents"],
    queryFn: async () => {
      const { getInstalledAgentsFn } = await import("@/server/agent-config")
      return getInstalledAgentsFn()
    },
  })

  const setMainAgentMutation = useMutation({
    mutationFn: async (agent: AgentType) => {
      const { setMainAgentFn } = await import("@/server/agent-config")
      return setMainAgentFn({ data: { agent } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainAgent"] })
    },
  })

  const mainAgentConfig = installedAgents.find((a) => a.name === mainAgent)

  return (
    <AgentContext.Provider
      value={{
        mainAgent,
        mainAgentConfig,
        installedAgents,
        setMainAgent: (agent) => setMainAgentMutation.mutate(agent),
        isLoading: isLoadingAgent || isLoadingAgents,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider")
  return ctx
}

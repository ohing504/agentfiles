import { Plus, WorkflowIcon } from "lucide-react"
import { ListItem } from "@/components/ui/list-item"
import type { Scope } from "@/shared/types"
import { useAgentsSelection } from "../context/AgentsContext"

export function AgentsScopeSection({
  label,
  scope,
  onAddClick,
}: {
  label: string
  scope: Scope
  onAddClick: () => void
}) {
  const {
    agents: allAgents,
    selectedAgent,
    handleSelectAgent,
  } = useAgentsSelection()

  const agents = (allAgents ?? []).filter(
    (a) => a.scope === scope && a.type === "agent",
  )

  return (
    <div>
      <div className="flex items-center justify-between h-8 px-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center justify-center rounded p-0.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          aria-label={`Add agent to ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {agents.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">
          No agents configured
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {agents.map((agent) => (
            <ListItem
              key={agent.path}
              icon={WorkflowIcon}
              label={agent.name}
              selected={selectedAgent?.path === agent.path}
              onClick={() => handleSelectAgent(agent)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

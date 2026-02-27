import { Plus, WorkflowIcon } from "lucide-react"
import { ItemContextMenu } from "@/components/ui/item-context-menu"
import { ListItem } from "@/components/ui/list-item"
import type { AgentFile, Scope } from "@/shared/types"
import { useAgentsSelection } from "../context/AgentsContext"

export function AgentsScopeSection({
  label,
  scope,
  onAddClick,
  onDeleteAgent,
}: {
  label: string
  scope: Scope
  onAddClick: () => void
  onDeleteAgent?: (agent: AgentFile) => void
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
            <ItemContextMenu
              key={agent.path}
              filePath={agent.path}
              onDelete={onDeleteAgent ? () => onDeleteAgent(agent) : undefined}
              deleteTitle="Delete Agent"
              deleteDescription={`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`}
            >
              <ListItem
                icon={WorkflowIcon}
                label={agent.name}
                selected={selectedAgent?.path === agent.path}
                onClick={() => handleSelectAgent(agent)}
              />
            </ItemContextMenu>
          ))}
        </div>
      )}
    </div>
  )
}

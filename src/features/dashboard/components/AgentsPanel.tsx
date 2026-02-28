import { ListItem } from "@/components/ui/list-item"
import { useAgentFiles } from "@/hooks/use-config"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface AgentsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function AgentsPanel({ onSelectItem }: AgentsPanelProps) {
  const {
    query: { data: files = [] },
  } = useAgentFiles("agent")
  const groups = groupByScope(files)

  return (
    <OverviewPanel title="Agents" count={files.length}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No agents</p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((file) => (
                <ListItem
                  key={`${file.scope}-${file.name}`}
                  icon={ENTITY_ICONS.agent}
                  label={file.name}
                  onClick={() => onSelectItem?.({ type: "agent", agent: file })}
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

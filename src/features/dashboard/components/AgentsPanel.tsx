import { Bot } from "lucide-react"
import { useAgentFiles } from "@/hooks/use-config"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

export function AgentsPanel() {
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
                <div
                  key={`${file.scope}-${file.name}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
                >
                  <Bot className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

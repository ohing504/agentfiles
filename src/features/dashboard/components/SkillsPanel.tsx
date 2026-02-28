import { ScrollText } from "lucide-react"
import { ListItem } from "@/components/ui/list-item"
import { useAgentFiles } from "@/hooks/use-config"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface SkillsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function SkillsPanel({ onSelectItem }: SkillsPanelProps) {
  const {
    query: { data: files = [] },
  } = useAgentFiles("skill")
  const groups = groupByScope(files)

  return (
    <OverviewPanel title="Skills" count={files.length}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No skills</p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((file) => (
                <ListItem
                  key={`${file.scope}-${file.name}`}
                  icon={ScrollText}
                  label={file.name}
                  onClick={() => onSelectItem?.({ type: "skill", skill: file })}
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

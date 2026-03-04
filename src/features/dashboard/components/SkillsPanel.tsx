import { ScrollText } from "lucide-react"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { useAgentFiles } from "@/hooks/use-config"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { groupByScope, ScopeGroup } from "./ScopeGroup"

interface SkillsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
  href?: string
}

export function SkillsPanel({
  onSelectItem,
  onAction,
  href,
}: SkillsPanelProps) {
  const {
    query: { data: files = [] },
  } = useAgentFiles("skill")
  const groups = groupByScope(files)

  return (
    <OverviewPanel title="Skills" count={files.length} href={href}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No skills</p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((file) => {
                const target = { type: "skill" as const, skill: file }
                return (
                  <EntityActionContextMenu
                    key={`${file.scope}-${file.name}`}
                    actions={ENTITY_ACTIONS.skill}
                    onAction={(id) => onAction?.(id, target)}
                    itemName={file.frontmatter?.name ?? file.name}
                  >
                    <ListItem
                      icon={ScrollText}
                      label={file.frontmatter?.name ?? file.name}
                      trailing={
                        <span className="flex items-center gap-1">
                          {file.frontmatter?.description && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {String(file.frontmatter.description)}
                            </span>
                          )}
                          <EntityActionDropdown
                            actions={ENTITY_ACTIONS.skill}
                            onAction={(id) => onAction?.(id, target)}
                            itemName={file.frontmatter?.name ?? file.name}
                          />
                        </span>
                      }
                      onClick={() => onSelectItem?.(target)}
                    />
                  </EntityActionContextMenu>
                )
              })}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

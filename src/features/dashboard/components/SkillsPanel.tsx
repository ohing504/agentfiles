import { ScrollText } from "lucide-react"
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { useAgentFiles } from "@/hooks/use-config"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { m } from "@/paraglide/messages"
import type { DashboardDetailTarget } from "../types"

interface SkillsPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

export function SkillsPanel({
  scopeFilter,
  onSelectItem,
  onAction,
}: SkillsPanelProps) {
  const {
    query: { data: files = [] },
  } = useAgentFiles("skill")
  const filtered = scopeFilter
    ? files.filter((f) => f.scope === scopeFilter)
    : files

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <ScrollText />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_skills()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {filtered.map((file) => {
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
    </div>
  )
}

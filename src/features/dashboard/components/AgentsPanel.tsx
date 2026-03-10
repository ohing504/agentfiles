import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  EntityActionContextMenu,
  EntityActionDropdown,
} from "@/components/ui/entity-action-menu"
import { ListItem } from "@/components/ui/list-item"
import { useAgentFiles } from "@/hooks/use-config"
import type { EntityActionId } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { m } from "@/paraglide/messages"
import type { DashboardDetailTarget } from "../types"

interface AgentsPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (
    id: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

export function AgentsPanel({
  scopeFilter,
  onSelectItem,
  onAction,
}: AgentsPanelProps) {
  const {
    query: { data: files = [] },
  } = useAgentFiles("agent")
  const filtered = scopeFilter
    ? files.filter((f) => f.scope === scopeFilter)
    : files

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <ENTITY_ICONS.agent />
        </EmptyMedia>
        <EmptyDescription>{m.board_no_agents()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {filtered.map((file) => {
        const target = { type: "agent" as const, agent: file }
        return (
          <EntityActionContextMenu
            key={`${file.scope}-${file.name}`}
            actions={ENTITY_ACTIONS.agent}
            onAction={(id) => onAction?.(id, target)}
            itemName={file.frontmatter?.name ?? file.name}
          >
            <ListItem
              icon={ENTITY_ICONS.agent}
              label={file.frontmatter?.name ?? file.name}
              description={
                file.frontmatter?.description
                  ? String(file.frontmatter.description)
                  : undefined
              }
              trailing={
                <EntityActionDropdown
                  actions={ENTITY_ACTIONS.agent}
                  onAction={(id) => onAction?.(id, target)}
                  itemName={file.frontmatter?.name ?? file.name}
                />
              }
              onClick={() => onSelectItem?.(target)}
            />
          </EntityActionContextMenu>
        )
      })}
    </div>
  )
}

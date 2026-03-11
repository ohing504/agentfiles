import type React from "react"
import {
  DetailPanel,
  DetailPanelActions,
  DetailPanelContent,
  DetailPanelHeader,
  DetailPanelTitle,
} from "@/components/panel/detail-panel"
import { EntityActionDropdown } from "@/components/ui/entity-action-menu"
import { getEntityConfig } from "@/config/entity-registry"
import type { EntityActionId, EntityActionType } from "@/lib/entity-actions"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"

interface EntityDetailPanelProps {
  /** 엔티티 타입 */
  type: string
  /** 엔티티 데이터 */
  item: unknown
  /** 패널 닫기 */
  onClose?: () => void
  /** 액션 핸들러 */
  onAction?: (actionId: EntityActionId) => void
  /** 추가 header trailing 위젯 (예: MCP Switch) */
  headerTrailing?: React.ReactNode
  /** DetailContent에 전달할 추가 props */
  contentProps?: Record<string, unknown>
}

export function EntityDetailPanel({
  type,
  item,
  onClose,
  onAction,
  headerTrailing,
  contentProps = {},
}: EntityDetailPanelProps) {
  const config = getEntityConfig(type)
  if (!config) return null

  const entityActions =
    type in ENTITY_ACTIONS
      ? ENTITY_ACTIONS[type as EntityActionType]
      : undefined
  const DetailContent = config.DetailContent

  return (
    <DetailPanel>
      <DetailPanelHeader onClose={onClose}>
        <DetailPanelTitle icon={config.icon}>
          {config.getLabel(item)}
        </DetailPanelTitle>
        <DetailPanelActions>
          {headerTrailing}
          {entityActions && entityActions.length > 0 && onAction && (
            <EntityActionDropdown
              actions={entityActions}
              onAction={(id) => onAction(id)}
              itemName={config.getLabel(item)}
            />
          )}
        </DetailPanelActions>
      </DetailPanelHeader>
      <DetailPanelContent>
        <DetailContent item={item} {...contentProps} />
      </DetailPanelContent>
    </DetailPanel>
  )
}

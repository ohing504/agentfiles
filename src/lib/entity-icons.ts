import {
  Plug2Icon,
  ScrollTextIcon,
  ServerIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

/**
 * 각 엔티티 타입의 표준 아이콘.
 * 사이드바(Sidebar.tsx)와 동일한 아이콘을 사용해야 하므로 여기서 중앙 관리.
 */
export const ENTITY_ICONS = {
  skill: ScrollTextIcon,
  agent: WorkflowIcon,
  mcp: ServerIcon,
  hook: ZapIcon,
  plugin: Plug2Icon,
} as const

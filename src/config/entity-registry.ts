import type { LucideIcon } from "lucide-react"
import type React from "react"
import type { EntityActionId } from "@/lib/entity-actions"

// DashboardDetailTarget은 components/board/types.ts에 위치

export interface EntityConfig<T = unknown> {
  /** 엔티티 타입 식별자 */
  type: string
  /** 표시 아이콘 */
  icon: LucideIcon
  /** 사용 가능한 액션 ID 목록 */
  actions: EntityActionId[]
  /** 고유 키 추출 */
  getKey: (item: T) => string
  /** 표시 라벨 추출 */
  getLabel: (item: T) => string
  /** 부가 설명 추출 */
  getDescription?: (item: T) => string | undefined
  /** 스코프 추출 (user/project) */
  getScope?: (item: T) => string | undefined
  /** 그룹화 키 추출 (Hook 이벤트 그룹 등) */
  groupBy?: (item: T) => string
  /** 아이템 우측 trailing 위젯 */
  trailing?: (item: T) => React.ReactNode
  /** 상세 뷰 콘텐츠 컴포넌트 */
  DetailContent: React.ComponentType<{ item: T; [key: string]: unknown }>
  /** DashboardDetailTarget 생성 */
  toDetailTarget: (item: T) => unknown // 실제 전환 시 DashboardDetailTarget으로 변경
}

/** 엔티티 레지스트리 */
const registry = new Map<string, EntityConfig>()

export function registerEntity<T>(config: EntityConfig<T>) {
  registry.set(config.type, config as EntityConfig)
}

export function getEntityConfig(type: string): EntityConfig | undefined {
  return registry.get(type)
}

export function getAllEntityConfigs(): EntityConfig[] {
  return Array.from(registry.values())
}

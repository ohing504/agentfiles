# Entity System Architecture Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 중복된 15+ 패널 컴포넌트를 제네릭 엔티티 시스템으로 통합하고, 레거시 에디터를 대시보드로 병합한 뒤 `features/` 구조를 플랫하게 전환한다.

**Architecture:** shadcn 스타일 compound components(`Panel`, `DetailPanel`)를 만들고, 엔티티별 설정 객체(`EntityConfig`)로 제네릭 `EntityListPanel`/`EntityDetailPanel`이 렌더링한다. 기존 `DetailView` 컴포넌트는 그대로 재활용한다.

**Tech Stack:** React 19, TypeScript, TanStack Router/Query, shadcn/ui, Tailwind CSS v4

**Design Doc:** `docs/plans/2026-03-11-entity-system-redesign-design.md`

---

## Phase 1: Foundation (비파괴적 — 새 파일만 생성)

### Task 1: Panel Primitives 생성

**Files:**
- Create: `src/components/panel/index.tsx`
- Create: `src/components/panel/detail-panel.tsx`

**Step 1: Panel compound component 작성**

`src/components/panel/index.tsx` — 리스트 패널 컨테이너:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

// --- Panel ---
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>
}

// --- PanelHeader ---
function PanelHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-2.5 py-2", className)}>
      {children}
    </div>
  )
}

// --- PanelTitle ---
function PanelTitle({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-sm font-medium", className)}>
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      {children}
    </div>
  )
}

// --- PanelCount ---
function PanelCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

// --- PanelActions ---
function PanelActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("ml-auto flex items-center gap-1", className)}>{children}</div>
}

// --- PanelContent ---
function PanelContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5", className)}>
      {children}
    </div>
  )
}

// --- PanelEmpty ---
function PanelEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 flex items-center justify-center p-4", className)}>{children}</div>
}

export { Panel, PanelHeader, PanelTitle, PanelCount, PanelActions, PanelContent, PanelEmpty }
```

**Step 2: DetailPanel compound component 작성**

`src/components/panel/detail-panel.tsx` — 상세 패널 컨테이너:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SheetTitle } from "@/components/ui/sheet"
import { ChevronsRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

// --- DetailPanel ---
function DetailPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>
}

// --- DetailPanelHeader ---
function DetailPanelHeader({
  onClose,
  children,
  className,
}: {
  onClose?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 h-12 px-3 border-b shrink-0", className)}>
      {onClose && (
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <ChevronsRight className="size-4" />
        </Button>
      )}
      {children}
    </div>
  )
}

// --- DetailPanelTitle ---
function DetailPanelTitle({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", className)}>
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
      <SheetTitle className="text-sm font-medium truncate">{children}</SheetTitle>
    </div>
  )
}

// --- DetailPanelActions ---
function DetailPanelActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-1 shrink-0", className)}>{children}</div>
}

// --- DetailPanelContent ---
function DetailPanelContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)}>
      {children}
    </div>
  )
}

export { DetailPanel, DetailPanelHeader, DetailPanelTitle, DetailPanelActions, DetailPanelContent }
```

**Step 3: Verify**

Run: `pnpm typecheck`

**Step 4: Commit**

```
feat(panel): add Panel and DetailPanel compound components
```

---

### Task 2: EntityConfig 타입 및 레지스트리 생성

**Files:**
- Create: `src/config/entity-registry.ts`

**Step 1: EntityConfig 인터페이스 및 레지스트리 작성**

```tsx
import type { LucideIcon } from "lucide-react"
import type { EntityActionId } from "@/lib/entity-actions"
import type { DashboardDetailTarget } from "@/components/board/types"

export interface EntityConfig<T = any> {
  /** 엔티티 타입 식별자 */
  type: string
  /** 표시 아이콘 (ENTITY_ICONS에서) */
  icon: LucideIcon
  /** 사용 가능한 액션 목록 */
  actions: EntityActionId[]
  /** 고유 키 추출 */
  getKey: (item: T) => string
  /** 표시 라벨 추출 */
  getLabel: (item: T) => string
  /** 부가 설명 추출 */
  getDescription?: (item: T) => string | undefined
  /** 스코프 추출 (user/project) */
  getScope?: (item: T) => string | undefined
  /** 그룹화 키 추출 (Hook 이벤트 등) */
  groupBy?: (item: T) => string
  /** 아이템 우측 trailing 위젯 */
  trailing?: (item: T) => React.ReactNode
  /** 상세 뷰 콘텐츠 컴포넌트 */
  DetailContent: React.FC<{ item: T; [key: string]: any }>
  /** DashboardDetailTarget 생성 */
  toDetailTarget: (item: T) => DashboardDetailTarget
}

/** 엔티티 레지스트리 — 모든 엔티티 설정을 여기에 등록 */
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
```

**Step 2: DashboardDetailTarget 타입 파일 이동 준비**

현재 `src/features/dashboard/types.ts`에 있는 `DashboardDetailTarget` 타입을 나중에 `src/components/board/types.ts`로 이동할 예정. 이 단계에서는 기존 위치를 임포트.

**Step 3: Verify**

Run: `pnpm typecheck`

**Step 4: Commit**

```
feat(config): add EntityConfig type and entity registry
```

---

### Task 3: 각 엔티티별 Config 생성

**Files:**
- Create: `src/config/entities/skill-config.ts`
- Create: `src/config/entities/agent-config.ts`
- Create: `src/config/entities/hook-config.ts`
- Create: `src/config/entities/mcp-config.ts`
- Create: `src/config/entities/plugin-config.ts`
- Create: `src/config/entities/memory-config.ts`
- Create: `src/config/entities/file-config.ts`
- Create: `src/config/entities/index.ts`

**Step 1: 단순 엔티티 config 작성 (Skill, Agent, Memory)**

`src/config/entities/skill-config.ts`:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { SkillDetailView } from "@/components/entity/SkillDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import type { AgentFile } from "@/shared/types"

export const skillConfig: EntityConfig<AgentFile> = {
  type: "skill",
  icon: ENTITY_ICONS.skill,
  actions: ["open-vscode", "open-cursor", "open-folder", "delete"],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  getDescription: (item) => item.frontmatter?.description,
  getScope: (item) => item.scope,
  DetailContent: SkillDetailView,
  toDetailTarget: (item) => ({ type: "skill" as const, skill: item }),
}
```

`src/config/entities/agent-config.ts`:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { AgentDetailView } from "@/components/entity/AgentDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import type { AgentFile } from "@/shared/types"

export const agentConfig: EntityConfig<AgentFile> = {
  type: "agent",
  icon: ENTITY_ICONS.agent,
  actions: ["open-vscode", "open-cursor", "delete"],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  getDescription: (item) => item.frontmatter?.description,
  getScope: (item) => item.scope,
  DetailContent: AgentDetailView,
  toDetailTarget: (item) => ({ type: "agent" as const, agent: item }),
}
```

`src/config/entities/memory-config.ts`:
```tsx
import { FileTextIcon } from "lucide-react"
import { MemoryDetailView } from "@/components/entity/MemoryDetailView"
import type { EntityConfig } from "@/config/entity-registry"

export const memoryConfig: EntityConfig<{ name: string; path: string; size: number; content?: string }> = {
  type: "memory",
  icon: FileTextIcon,
  actions: [],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  getDescription: (item) => `${item.size} bytes`,
  DetailContent: MemoryDetailView,
  toDetailTarget: (item) => ({ type: "memory" as const, file: item }),
}
```

**Step 2: 특수 엔티티 config 작성 (Hook, MCP)**

`src/config/entities/hook-config.ts`:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { HookDetailView } from "@/components/entity/HookDetailView"
import type { EntityConfig } from "@/config/entity-registry"

export const hookConfig: EntityConfig = {
  type: "hook",
  icon: ENTITY_ICONS.hook,
  actions: ["open-vscode", "open-cursor", "edit", "delete"],
  getKey: (item) => `${item.event}-${item.command ?? item.prompt ?? ""}`,
  getLabel: (item) => item.command?.split("/").pop() ?? item.prompt ?? item.event,
  getScope: (item) => item.scope,
  groupBy: (item) => item.event,
  DetailContent: HookDetailView,
  toDetailTarget: (item) => ({
    type: "hook" as const,
    hook: item,
    event: item.event,
    matcher: item.matcher,
    scope: item.scope,
  }),
}
```

`src/config/entities/mcp-config.ts`:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { McpDetailView } from "@/components/entity/McpDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import type { McpServer } from "@/shared/types"

export const mcpConfig: EntityConfig<McpServer> = {
  type: "mcp",
  icon: ENTITY_ICONS.mcp,
  actions: ["open-vscode", "open-cursor", "edit", "delete"],
  getKey: (item) => `${item.scope}-${item.name}`,
  getLabel: (item) => item.name,
  getScope: (item) => item.scope,
  // trailing은 McpDirectPanel에서 Switch를 직접 렌더링 (config에서는 생략)
  DetailContent: McpDetailView,
  toDetailTarget: (item) => ({ type: "mcp" as const, server: item }),
}
```

**Step 3: Plugin, File config (복잡한 렌더러는 별도)**

`src/config/entities/plugin-config.ts`:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { PluginDetailView } from "@/components/entity/PluginDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import type { Plugin } from "@/shared/types"

export const pluginConfig: EntityConfig<Plugin> = {
  type: "plugin",
  icon: ENTITY_ICONS.plugin,
  actions: ["open-vscode", "open-cursor", "delete"],
  getKey: (item) => item.id,
  getLabel: (item) => item.name,
  getDescription: (item) => item.version ? `v${item.version}` : undefined,
  getScope: (item) => item.scope,
  DetailContent: PluginDetailView,
  toDetailTarget: (item) => ({ type: "plugin" as const, plugin: item }),
}
```

`src/config/entities/file-config.ts`:
```tsx
import { FileIcon } from "lucide-react"
import { FileDetailView } from "@/components/entity/FileDetailView"
import type { EntityConfig } from "@/config/entity-registry"

export const fileConfig: EntityConfig<{ name: string; path: string }> = {
  type: "file",
  icon: FileIcon,
  actions: ["open-vscode", "open-cursor"],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  DetailContent: FileDetailView,
  toDetailTarget: (item) => ({ type: "file" as const, filePath: item.path }),
}
```

**Step 4: 레지스트리 등록 인덱스**

`src/config/entities/index.ts`:
```tsx
import { registerEntity } from "@/config/entity-registry"
import { skillConfig } from "./skill-config"
import { agentConfig } from "./agent-config"
import { hookConfig } from "./hook-config"
import { mcpConfig } from "./mcp-config"
import { pluginConfig } from "./plugin-config"
import { memoryConfig } from "./memory-config"
import { fileConfig } from "./file-config"

export function registerAllEntities() {
  registerEntity(skillConfig)
  registerEntity(agentConfig)
  registerEntity(hookConfig)
  registerEntity(mcpConfig)
  registerEntity(pluginConfig)
  registerEntity(memoryConfig)
  registerEntity(fileConfig)
}

export {
  skillConfig,
  agentConfig,
  hookConfig,
  mcpConfig,
  pluginConfig,
  memoryConfig,
  fileConfig,
}
```

**Step 5: Verify**

Run: `pnpm typecheck`

> 참고: DetailView 컴포넌트가 아직 새 경로에 없으므로 타입 에러 발생 가능. Task 4에서 해결.

**Step 6: Commit**

```
feat(config): add entity configs for all 7 entity types
```

---

## Phase 2: DetailView 이동 및 제네릭 컴포넌트

### Task 4: DetailView 컴포넌트를 `components/entity/`로 이동

**Files:**
- Move: `src/components/HookDetailView.tsx` → `src/components/entity/HookDetailView.tsx`
- Move: `src/components/SkillDetailView.tsx` → `src/components/entity/SkillDetailView.tsx`
- Move: `src/components/McpDetailView.tsx` → `src/components/entity/McpDetailView.tsx`
- Create: `src/components/entity/AgentDetailView.tsx` (기존 `AgentDetailPanel` 인라인 콘텐츠 추출)
- Create: `src/components/entity/PluginDetailView.tsx` (기존 `PluginDetailPanel` 인라인 콘텐츠 추출)
- Create: `src/components/entity/FileDetailView.tsx` (기존 `FileDetailPanel` 인라인 콘텐츠 추출)
- Create: `src/components/entity/MemoryDetailView.tsx` (기존 `MemoryDetailPanel` 인라인 콘텐츠 추출)
- Create: `src/components/entity/index.ts`

**Step 1: 기존 DetailView 파일들을 새 경로로 이동**

`git mv` 사용:
```bash
mkdir -p src/components/entity
git mv src/components/HookDetailView.tsx src/components/entity/HookDetailView.tsx
git mv src/components/SkillDetailView.tsx src/components/entity/SkillDetailView.tsx
git mv src/components/McpDetailView.tsx src/components/entity/McpDetailView.tsx
```

**Step 2: 기존 인라인 콘텐츠를 DetailView로 추출**

각 기존 DetailPanel에서 콘텐츠 영역만 추출하여 새 DetailView 컴포넌트로 생성.

`AgentDetailView.tsx` — `AgentDetailPanel`의 메타 그리드 + FileViewer 콘텐츠 추출:
```tsx
// AgentDetailPanel.tsx에서 <DetailPanelHeader> 아래의 콘텐츠 영역을 추출
// Props: { item: AgentFile } (EntityConfig 표준 인터페이스)
```

`PluginDetailView.tsx` — `PluginDetailPanel`의 메타데이터 + 컴포넌트 카운트 콘텐츠 추출.

`FileDetailView.tsx` — `FileDetailPanel`의 FileViewer 콘텐츠 추출.

`MemoryDetailView.tsx` — `MemoryDetailPanel`의 `<pre>` 콘텐츠 추출.

**Step 3: index.ts 배럴 파일 작성**

```tsx
export { HookDetailView } from "./HookDetailView"
export { SkillDetailView } from "./SkillDetailView"
export { McpDetailView } from "./McpDetailView"
export { AgentDetailView } from "./AgentDetailView"
export { PluginDetailView } from "./PluginDetailView"
export { FileDetailView } from "./FileDetailView"
export { MemoryDetailView } from "./MemoryDetailView"
```

**Step 4: 기존 임포트 경로 업데이트**

기존에 `@/components/HookDetailView` 등으로 임포트하는 곳을 `@/components/entity/HookDetailView`로 변경.

검색 대상:
```
grep -r "from.*components/HookDetailView" src/
grep -r "from.*components/SkillDetailView" src/
grep -r "from.*components/McpDetailView" src/
```

**Step 5: Verify**

Run: `pnpm typecheck && pnpm lint`

**Step 6: Commit**

```
refactor(entity): move DetailView components to components/entity/
```

---

### Task 5: EntityDetailPanel 제네릭 컴포넌트 생성

**Files:**
- Create: `src/components/board/EntityDetailPanel.tsx`

**Step 1: 제네릭 EntityDetailPanel 작성**

기존 `HookDetailPanel`, `SkillDetailPanel`, `McpDetailPanel` 등의 공통 패턴을 추출:

```tsx
import { DetailPanel, DetailPanelHeader, DetailPanelTitle, DetailPanelActions, DetailPanelContent } from "@/components/panel/detail-panel"
import { EntityActionDropdown } from "@/components/ui/entity-action-menu"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import { getEntityConfig } from "@/config/entity-registry"
import type { EntityConfig } from "@/config/entity-registry"

interface EntityDetailPanelProps {
  /** 엔티티 타입 (config lookup용) 또는 직접 config 전달 */
  type: string
  /** 엔티티 데이터 */
  item: any
  /** 패널 닫기 */
  onClose?: () => void
  /** 액션 핸들러 */
  onAction?: (actionId: string) => void
  /** 추가 header trailing 위젯 (예: MCP Switch) */
  headerTrailing?: React.ReactNode
  /** DetailContent에 전달할 추가 props */
  contentProps?: Record<string, any>
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

  const actions = ENTITY_ACTIONS[type as keyof typeof ENTITY_ACTIONS] ?? []
  const DetailContent = config.DetailContent

  return (
    <DetailPanel>
      <DetailPanelHeader onClose={onClose}>
        <DetailPanelTitle icon={config.icon}>
          {config.getLabel(item)}
        </DetailPanelTitle>
        <DetailPanelActions>
          {headerTrailing}
          {actions.length > 0 && onAction && (
            <EntityActionDropdown
              actions={actions}
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
```

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```
feat(board): add generic EntityDetailPanel component
```

---

### Task 6: EntityListPanel 제네릭 컴포넌트 생성

**Files:**
- Create: `src/components/board/EntityListPanel.tsx`

**Step 1: 제네릭 EntityListPanel 작성**

기존 `SkillsPanel`, `AgentsPanel` 등의 공통 패턴을 추출. flat list + groupBy 지원:

```tsx
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import { EntityActionContextMenu, EntityActionDropdown } from "@/components/ui/entity-action-menu"
import { Empty, EmptyMedia } from "@/components/ui/empty"
import { ENTITY_ACTIONS } from "@/lib/entity-actions"
import type { EntityConfig } from "@/config/entity-registry"
import type { EntityActionId } from "@/lib/entity-actions"

interface EntityListPanelProps<T> {
  config: EntityConfig<T>
  items: T[]
  scopeFilter?: string
  onSelectItem?: (target: any) => void
  onAction?: (id: EntityActionId, target: any) => void
  /** 아이템별 trailing 위젯 렌더러 */
  renderTrailing?: (item: T) => React.ReactNode
}

export function EntityListPanel<T>({
  config,
  items,
  scopeFilter,
  onSelectItem,
  onAction,
  renderTrailing,
}: EntityListPanelProps<T>) {
  const filtered = scopeFilter && config.getScope
    ? items.filter((item) => config.getScope!(item) === scopeFilter)
    : items

  if (filtered.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <config.icon className="size-8" />
        </EmptyMedia>
      </Empty>
    )
  }

  const actions = ENTITY_ACTIONS[config.type as keyof typeof ENTITY_ACTIONS] ?? []

  // --- Grouped rendering (e.g. Hooks by event) ---
  if (config.groupBy) {
    const groups = new Map<string, T[]>()
    for (const item of filtered) {
      const key = config.groupBy(item)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }

    return (
      <>
        {Array.from(groups.entries()).map(([groupKey, groupItems]) => (
          <ListItem
            key={groupKey}
            icon={config.icon}
            label={groupKey}
            open
            trailing={
              <span className="text-xs text-muted-foreground tabular-nums">
                {groupItems.length}
              </span>
            }
          >
            {groupItems.map((item) => (
              <EntityActionContextMenu
                key={config.getKey(item)}
                actions={actions}
                onAction={(id) => onAction?.(id, config.toDetailTarget(item))}
                itemName={config.getLabel(item)}
              >
                <ListSubItem
                  icon={config.icon}
                  label={config.getLabel(item)}
                  onClick={() => onSelectItem?.(config.toDetailTarget(item))}
                  trailing={
                    <>
                      {renderTrailing?.(item)}
                      {actions.length > 0 && onAction && (
                        <EntityActionDropdown
                          actions={actions}
                          onAction={(id) => onAction(id, config.toDetailTarget(item))}
                          itemName={config.getLabel(item)}
                        />
                      )}
                    </>
                  }
                />
              </EntityActionContextMenu>
            ))}
          </ListItem>
        ))}
      </>
    )
  }

  // --- Flat rendering (e.g. Skills, Agents) ---
  return (
    <>
      {filtered.map((item) => (
        <EntityActionContextMenu
          key={config.getKey(item)}
          actions={actions}
          onAction={(id) => onAction?.(id, config.toDetailTarget(item))}
          itemName={config.getLabel(item)}
        >
          <ListItem
            icon={config.icon}
            label={config.getLabel(item)}
            description={config.getDescription?.(item)}
            onClick={() => onSelectItem?.(config.toDetailTarget(item))}
            trailing={
              <>
                {renderTrailing?.(item)}
                {actions.length > 0 && onAction && (
                  <EntityActionDropdown
                    actions={actions}
                    onAction={(id) => onAction(id, config.toDetailTarget(item))}
                    itemName={config.getLabel(item)}
                  />
                )}
              </>
            }
          />
        </EntityActionContextMenu>
      ))}
    </>
  )
}
```

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```
feat(board): add generic EntityListPanel component
```

---

## Phase 3: 마이그레이션 (기존 → 신규 전환)

### Task 7: Board 컴포넌트를 `components/board/`로 이동

**Files:**
- Move: `src/features/dashboard/components/BoardLayout.tsx` → `src/components/board/BoardLayout.tsx`
- Move: `src/features/dashboard/components/BoardColumnSettings.tsx` → `src/components/board/BoardColumnSettings.tsx`
- Move: `src/features/dashboard/components/DetailPanelContent.tsx` → `src/components/board/DetailPanelContent.tsx`
- Move: `src/features/dashboard/components/DetailPanelHeader.tsx` → `src/components/board/DetailPanelHeader.tsx`
- Move: `src/features/dashboard/types.ts` → `src/components/board/types.ts`
- Move remaining dashboard panels temporarily

**Step 1: board 디렉토리 생성 및 파일 이동**

```bash
mkdir -p src/components/board
git mv src/features/dashboard/components/BoardLayout.tsx src/components/board/
git mv src/features/dashboard/components/BoardColumnSettings.tsx src/components/board/
git mv src/features/dashboard/components/DetailPanelContent.tsx src/components/board/
git mv src/features/dashboard/components/DetailPanelHeader.tsx src/components/board/
git mv src/features/dashboard/types.ts src/components/board/types.ts
```

**Step 2: 기존 패널 파일들도 board/로 이동 (임시 — 이후 EntityListPanel로 대체)**

```bash
git mv src/features/dashboard/components/SkillsPanel.tsx src/components/board/
git mv src/features/dashboard/components/AgentsPanel.tsx src/components/board/
git mv src/features/dashboard/components/HooksPanel.tsx src/components/board/
git mv src/features/dashboard/components/McpDirectPanel.tsx src/components/board/
git mv src/features/dashboard/components/PluginsPanel.tsx src/components/board/
git mv src/features/dashboard/components/MemoryPanel.tsx src/components/board/
git mv src/features/dashboard/components/FilesPanel.tsx src/components/board/
git mv src/features/dashboard/components/LspServersPanel.tsx src/components/board/
git mv src/features/dashboard/components/FileDetailPanel.tsx src/components/board/
git mv src/features/dashboard/components/MemoryDetailPanel.tsx src/components/board/
```

**Step 3: 모든 임포트 경로 업데이트**

`@/features/dashboard/components/` → `@/components/board/` 변경.
`@/features/dashboard/types` → `@/components/board/types` 변경.

검색:
```
grep -r "features/dashboard" src/
```

모든 임포트를 새 경로로 업데이트.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 5: Commit**

```
refactor(board): move dashboard components to components/board/
```

---

### Task 8: API/Query 파일을 features/에서 이동

**Files:**
- Move: `src/features/hooks-editor/api/` → `src/server/hooks.ts` + `src/hooks/use-hooks.ts`
- Move: `src/features/skills-editor/api/` → 이미 `src/server/items.ts`에 통합 확인
- Move: `src/features/agents-editor/api/` → 이미 통합 확인
- Move: `src/features/plugins-editor/api/` → 이미 `src/server/plugins.ts`에 통합 확인
- Move: `src/features/mcp-editor/api/` → 이미 `src/server/mcp.ts`에 통합 확인
- Move constants 파일들

**Step 1: 각 features/*/api/ 파일이 src/server/ 또는 src/hooks/에 이미 중복되는지 확인**

기존 `src/server/`와 `src/hooks/`에 이미 동일 기능이 있다면 features 쪽을 삭제하고 임포트만 변경.
없다면 이동.

**Step 2: constants 파일 이동**

```bash
# hooks 상수
git mv src/features/hooks-editor/constants.ts src/config/hook-constants.ts

# skills 상수
git mv src/features/skills-editor/constants.tsx src/config/skill-constants.tsx
```

**Step 3: 모든 임포트 경로 업데이트**

```
grep -r "features/hooks-editor" src/
grep -r "features/skills-editor" src/
grep -r "features/agents-editor" src/
grep -r "features/plugins-editor" src/
grep -r "features/mcp-editor" src/
grep -r "features/files-editor" src/
grep -r "features/config-editor" src/
```

**Step 4: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 5: Commit**

```
refactor: move feature API/constants to server/hooks/config
```

---

### Task 9: BoardLayout에서 EntityListPanel 사용으로 전환

**Files:**
- Modify: `src/components/board/BoardLayout.tsx`

**Step 1: renderPanel() 함수에서 단순 패널들을 EntityListPanel로 교체**

SkillsPanel, AgentsPanel 같은 단순 flat 패널부터 교체:

```tsx
// Before:
case "skills":
  return <SkillsPanel scopeFilter={scope} onSelectItem={...} onAction={...} />

// After:
case "skills":
  return (
    <EntityListPanel
      config={skillConfig}
      items={skills}
      scopeFilter={scope}
      onSelectItem={...}
      onAction={...}
    />
  )
```

**Step 2: 데이터 쿼리를 BoardLayout 레벨로 올리기**

각 패널이 개별적으로 호출하던 쿼리를 BoardLayout에서 한 번에 호출:

```tsx
const { data: skills = [] } = useAgentFiles("skill")
const { data: agents = [] } = useAgentFiles("agent")
const { data: hooks = [] } = useHooksQuery()
// etc.
```

**Step 3: 복잡한 패널(PluginsPanel, FilesPanel)은 기존 컴포넌트 유지**

Plugin 트리와 File 트리는 `EntityListPanel`로 처리할 수 없으므로 전용 컴포넌트로 유지.
이름을 `PluginListRenderer`, `FileTreeRenderer`로 변경하여 역할을 명확히.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm build && pnpm dev` (수동으로 대시보드 확인)

**Step 5: Commit**

```
refactor(board): replace individual panels with EntityListPanel
```

---

### Task 10: DetailPanelContent에서 EntityDetailPanel 사용으로 전환

**Files:**
- Modify: `src/components/board/DetailPanelContent.tsx`

**Step 1: switch/case를 EntityDetailPanel 기반으로 변경**

```tsx
// Before:
switch (target.type) {
  case "skill":
    return <SkillDetailPanel skill={target.skill} onDelete={...} />
  case "hook":
    return <HookDetailPanel hook={target.hook} event={target.event} ... />
  // ... 7개 case
}

// After:
// Plugin, File 등 특수 케이스만 switch, 나머지는 EntityDetailPanel
const config = getEntityConfig(target.type)
if (config) {
  return (
    <EntityDetailPanel
      type={target.type}
      item={extractItem(target)}
      onClose={onClose}
      onAction={(id) => handleAction(id, target)}
      headerTrailing={target.type === "mcp" ? <McpToggleSwitch ... /> : undefined}
    />
  )
}
```

**Step 2: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 3: Commit**

```
refactor(board): replace individual DetailPanels with EntityDetailPanel
```

---

### Task 11: 에디터 다이얼로그 마이그레이션

**Files:**
- Move: `src/features/hooks-editor/components/AddHookDialog.tsx` → `src/components/board/AddHookDialog.tsx`
- Move: `src/features/skills-editor/components/AddSkillDialog.tsx` → `src/components/board/AddSkillDialog.tsx`

**Step 1: 다이얼로그 파일 이동 및 임포트 경로 수정**

```bash
git mv src/features/hooks-editor/components/AddHookDialog.tsx src/components/board/AddHookDialog.tsx
git mv src/features/skills-editor/components/AddSkillDialog.tsx src/components/board/AddSkillDialog.tsx
```

**Step 2: BoardLayout에서 다이얼로그 연결**

패널 헤더의 PanelActions에 "+" 버튼 추가하여 다이얼로그 트리거.

**Step 3: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 4: Commit**

```
feat(board): migrate AddHookDialog and AddSkillDialog to dashboard
```

---

## Phase 4: 정리 및 삭제

### Task 12: 레거시 에디터 라우트 삭제

**Files:**
- Delete: `src/routes/agents/route.tsx`
- Delete: `src/routes/skills/route.tsx`
- Delete: `src/routes/mcp/route.tsx`
- Delete: `src/routes/plugins/route.tsx`
- Delete: `src/routes/hooks/route.tsx` (이미 git status에서 D)

**Step 1: 라우트 파일 삭제**

```bash
rm -f src/routes/agents/route.tsx
rm -f src/routes/skills/route.tsx
rm -f src/routes/mcp/route.tsx
rm -f src/routes/plugins/route.tsx
rm -f src/routes/hooks/route.tsx
```

**Step 2: routeTree.gen.ts 재생성**

Run: `pnpm dev` (TanStack Router가 자동으로 routeTree 재생성)

**Step 3: Sidebar 업데이트**

`src/components/layout/Sidebar.tsx`에서 에디터 라우트 링크 제거.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 5: Commit**

```
refactor(routes): remove legacy editor routes
```

---

### Task 13: features/ 디렉토리 삭제

**Files:**
- Delete: `src/features/` 전체 디렉토리

**Step 1: features/ 디렉토리에 남은 파일 확인**

```bash
find src/features -type f
```

이 시점에서 모든 필요한 파일은 이미 이동 완료. 남은 파일 확인 후 삭제.

**Step 2: 삭제**

```bash
rm -rf src/features/
```

**Step 3: 잔여 임포트 확인**

```
grep -r "features/" src/
```

발견되면 수정.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 5: Commit**

```
refactor: remove features/ directory (flat structure migration)
```

---

### Task 14: 구 DetailPanel 컴포넌트 삭제

**Files:**
- Delete: `src/components/HookDetailPanel.tsx`
- Delete: `src/components/SkillDetailPanel.tsx`
- Delete: `src/components/McpDetailPanel.tsx`
- Delete: `src/components/PluginDetailPanel.tsx`
- Delete: `src/components/board/OverviewPanel.tsx` (이미 미사용)
- Delete: `src/components/board/ProjectOverviewGrid.tsx` (이미 미사용)
- Delete: `src/components/DetailField.tsx` (entity/로 이동 완료 시)

**Step 1: 각 파일의 임포트 여부 확인**

```bash
grep -r "HookDetailPanel" src/
grep -r "SkillDetailPanel" src/
grep -r "McpDetailPanel" src/
grep -r "PluginDetailPanel" src/
grep -r "OverviewPanel" src/
grep -r "ProjectOverviewGrid" src/
```

임포트가 없는 것만 삭제.

**Step 2: 삭제**

```bash
rm src/components/HookDetailPanel.tsx
rm src/components/SkillDetailPanel.tsx
rm src/components/McpDetailPanel.tsx
rm src/components/PluginDetailPanel.tsx
```

**Step 3: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 4: Commit**

```
refactor: remove legacy DetailPanel components (replaced by EntityDetailPanel)
```

---

### Task 15: 사용하지 않는 개별 패널 삭제

**Files:**
- Delete: `src/components/board/SkillsPanel.tsx` (EntityListPanel로 대체)
- Delete: `src/components/board/AgentsPanel.tsx`
- Delete: `src/components/board/HooksPanel.tsx`
- Delete: `src/components/board/McpDirectPanel.tsx`
- Delete: `src/components/board/MemoryPanel.tsx`
- Delete: `src/components/board/LspServersPanel.tsx`
- Delete: `src/components/board/FileDetailPanel.tsx`
- Delete: `src/components/board/MemoryDetailPanel.tsx`
- Delete: `src/components/board/DetailPanelHeader.tsx` (DetailPanel primitive로 대체)

**Step 1: 각 파일의 임포트 여부 확인**

```bash
grep -r "SkillsPanel" src/
# ... 각 파일별 확인
```

BoardLayout에서 더 이상 임포트하지 않는 것만 삭제.
PluginsPanel (→ PluginListRenderer), FilesPanel (→ FileTreeRenderer)은 유지.

**Step 2: 삭제**

확인된 미사용 파일만 삭제.

**Step 3: Verify**

Run: `pnpm typecheck && pnpm build`

**Step 4: Commit**

```
refactor: remove individual panel components (replaced by EntityListPanel)
```

---

## Phase 5: 최종 검증

### Task 16: 전체 품질 검증

**Step 1: Lint**

Run: `pnpm lint`

에러 수정.

**Step 2: TypeCheck**

Run: `pnpm typecheck`

에러 수정.

**Step 3: Test**

Run: `pnpm test`

기존 테스트 통과 확인. 깨진 임포트 경로 수정.

**Step 4: Build**

Run: `pnpm build`

프로덕션 빌드 성공 확인.

**Step 5: 수동 확인**

Run: `pnpm dev`

- 대시보드 열기 → 모든 패널 렌더링 확인
- 각 엔티티 클릭 → 상세 패널 열림 확인
- 우클릭 메뉴 → 액션 동작 확인
- 스코프 필터링 (User/Project) 확인

**Step 6: Commit**

```
chore: fix lint/type errors after entity system refactor
```

---

### Task 17: 설계 문서 완료 처리

**Files:**
- Modify: `docs/plans/2026-03-11-entity-system-redesign-design.md`
- Modify: `docs/plans/2026-03-11-entity-system-redesign.md`

**Step 1: 설계 문서 Status를 Completed로 변경**

**Step 2: 구현 계획에서 상세 태스크 제거, Summary만 유지**

**Step 3: CLAUDE.md 프로젝트 구조 섹션 업데이트**

새 파일 구조를 반영.

**Step 4: Commit**

```
docs: mark entity system redesign as completed
```

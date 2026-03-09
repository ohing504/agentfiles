# v2 Board-Style Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 3x2 그리드 대시보드를 노션 보드 스타일의 수평 스크롤 열 레이아웃으로 전면 교체한다.

**Architecture:** 엔티티 타입별 수직 열(BoardColumn)을 수평으로 배치하고, 각 열 내부에 Scope 서브그룹을 둔다. 열 순서/표시 설정은 agentfiles.json에 저장하고, 디테일 패널은 Sheet 오버레이로 표시한다. 기존 데이터 훅(React Query)과 액션 시스템은 그대로 유지한다.

**Tech Stack:** TypeScript, React 19, TanStack Start, shadcn/ui (Sheet, Collapsible, DropdownMenu), @dnd-kit/core + @dnd-kit/sortable, Tailwind CSS v4

**Design Doc:** `docs/plans/2026-03-09-v2-redesign-agent-ecosystem-manager.md`

---

## 실행 규칙

1. **각 Task = 1 논리적 커밋 단위**
2. Task 완료 후 반드시 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 통과
3. 사용자 피드백 받은 후 문제 없을 때만 커밋
4. 문제가 있으면 해결 후 다시 피드백 요청

---

## Task 1: Board 설정 타입 및 저장

> agentfiles.json에 보드 설정(열 순서, 표시/숨김)을 저장하는 기반을 만든다.

**Files:**
- Modify: `src/shared/types.ts` — BoardConfig 타입 추가
- Modify: `src/services/agentfiles-config.ts` — board config 읽기/쓰기
- Modify: `src/server/agent-config.ts` — 서버 함수 추가
- Create: `tests/unit/board-config.test.ts` — 테스트

### Step 1: 테스트 작성

```typescript
// tests/unit/board-config.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

import fs from "node:fs/promises"
import {
  getAgentfilesConfig,
  updateBoardConfig,
} from "@/services/agentfiles-config"

const mockedReadFile = vi.mocked(fs.readFile)
const mockedWriteFile = vi.mocked(fs.writeFile)
const mockedMkdir = vi.mocked(fs.mkdir)

describe("board-config", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedMkdir.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
  })

  it("returns default board config when not set", async () => {
    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    const config = await getAgentfilesConfig()
    expect(config.board).toBeDefined()
    expect(config.board.columnOrder).toEqual([
      "files", "plugins", "mcp", "skills", "agents", "hooks", "memory", "lsp",
    ])
    expect(config.board.hiddenColumns).toEqual(["lsp"])
  })

  it("reads existing board config", async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        mainAgent: "claude-code",
        board: {
          columnOrder: ["skills", "plugins", "mcp"],
          hiddenColumns: [],
        },
      }),
    )
    const config = await getAgentfilesConfig()
    expect(config.board.columnOrder).toEqual(["skills", "plugins", "mcp"])
    expect(config.board.hiddenColumns).toEqual([])
  })

  it("updates board config preserving other fields", async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ mainAgent: "claude-code" }),
    )
    await updateBoardConfig({ hiddenColumns: ["lsp", "hooks"] })
    const written = JSON.parse(mockedWriteFile.mock.calls[0][1] as string)
    expect(written.mainAgent).toBe("claude-code")
    expect(written.board.hiddenColumns).toEqual(["lsp", "hooks"])
  })
})
```

### Step 2: 테스트 실패 확인

Run: `pnpm test tests/unit/board-config.test.ts`
Expected: FAIL — `updateBoardConfig` 없음

### Step 3: 타입 추가

`src/shared/types.ts`에 추가:

```typescript
// ── Board Config ──
export type BoardColumnId =
  | "files"
  | "plugins"
  | "mcp"
  | "skills"
  | "agents"
  | "hooks"
  | "memory"
  | "lsp"

export interface BoardConfig {
  columnOrder: BoardColumnId[]
  hiddenColumns: BoardColumnId[]
}
```

`AgentfilesConfig` 확장:

```typescript
export interface AgentfilesConfig {
  mainAgent: AgentType
  board: BoardConfig
}
```

### Step 4: 서비스 구현

`src/services/agentfiles-config.ts` 수정:

```typescript
import type { AgentfilesConfig, AgentType, BoardConfig } from "@/shared/types"

const DEFAULT_BOARD_CONFIG: BoardConfig = {
  columnOrder: ["files", "plugins", "mcp", "skills", "agents", "hooks", "memory", "lsp"],
  hiddenColumns: ["lsp"],
}

const DEFAULT_CONFIG: AgentfilesConfig = {
  mainAgent: "claude-code",
  board: DEFAULT_BOARD_CONFIG,
}

export async function getAgentfilesConfig(): Promise<AgentfilesConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    const parsed = JSON.parse(content)
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      board: { ...DEFAULT_BOARD_CONFIG, ...parsed.board },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function updateBoardConfig(
  partial: Partial<BoardConfig>,
): Promise<void> {
  const config = await getAgentfilesConfig()
  config.board = { ...config.board, ...partial }
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
```

### Step 5: 서버 함수 추가

`src/server/agent-config.ts`에 추가:

```typescript
export const getBoardConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAgentfilesConfig } = await import("@/services/agentfiles-config")
    const config = await getAgentfilesConfig()
    return config.board
  },
)

export const updateBoardConfigFn = createServerFn({ method: "POST" })
  .inputValidator((data: { columnOrder?: string[]; hiddenColumns?: string[] }) => data)
  .handler(async ({ data }) => {
    const { updateBoardConfig } = await import("@/services/agentfiles-config")
    await updateBoardConfig(data as any)
    return { success: true }
  })
```

### Step 6: 테스트 통과 확인

Run: `pnpm test tests/unit/board-config.test.ts`
Expected: PASS

### Step 7: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(board): add board config types and persistence`

---

## Task 2: BoardColumn + BoardLayout 컴포넌트

> 수평 스크롤 보드 레이아웃과 개별 열 컴포넌트를 만든다. 기존 그리드를 대체한다.

**Files:**
- Create: `src/features/dashboard/components/BoardColumn.tsx` — 개별 열
- Create: `src/features/dashboard/components/BoardLayout.tsx` — 보드 레이아웃
- Modify: `src/features/dashboard/components/ProjectOverviewGrid.tsx` — BoardLayout 사용으로 교체
- Modify: `src/features/dashboard/types.ts` — 필요한 타입 추가

### Step 1: BoardColumn 컴포넌트

```tsx
// src/features/dashboard/components/BoardColumn.tsx
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface BoardColumnProps {
  id: string
  title: string
  icon: React.ElementType
  count?: number
  children: ReactNode
  className?: string
}

export function BoardColumn({
  title,
  icon: Icon,
  count,
  children,
  className,
}: BoardColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-[280px] min-w-[280px] shrink-0 border rounded-lg overflow-hidden bg-muted/30",
        className,
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 h-10 shrink-0 border-b">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-muted-foreground">({count})</span>
        )}
      </div>

      {/* Column body — vertical scroll */}
      <div className="flex-1 overflow-y-auto min-h-0 p-1">
        {children}
      </div>
    </div>
  )
}

interface BoardScopeGroupProps {
  scope: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

const SCOPE_LABELS: Record<string, string> = {
  user: "User",
  project: "Project",
  local: "Local",
  managed: "Managed",
}

export function BoardScopeGroup({
  scope,
  count,
  defaultOpen = true,
  children,
}: BoardScopeGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const label = SCOPE_LABELS[scope] ?? scope

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors">
        {open ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronRightIcon className="size-3" />
        )}
        {label}
        <span className="text-muted-foreground/50">{count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
```

### Step 2: BoardLayout 컴포넌트

```tsx
// src/features/dashboard/components/BoardLayout.tsx
import { useCallback, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { useEntityActionHandler } from "../hooks/use-entity-action-handler"
import type { DashboardDetailTarget } from "../types"
import { AgentsPanel } from "./AgentsPanel"
import { DetailPanelContent } from "./DetailPanelContent"
import { HooksPanel } from "./HooksPanel"
import { LspServersPanel } from "./LspServersPanel"
import { McpDirectPanel } from "./McpDirectPanel"
import { MemoryPanel } from "./MemoryPanel"
import { PluginsPanel } from "./PluginsPanel"
import { SkillsPanel } from "./SkillsPanel"

export function BoardLayout() {
  const { activeProjectPath } = useProjectContext()
  const [selected, setSelected] = useState<DashboardDetailTarget>(null)
  const handleAction = useEntityActionHandler(() => setSelected(null))

  const columnDefs = [
    { id: "plugins", title: "Plugins", icon: ENTITY_ICONS.plugin, panel: <PluginsPanel onSelectItem={setSelected} onAction={handleAction} /> },
    { id: "mcp", title: "MCP Servers", icon: ENTITY_ICONS.mcp, panel: <McpDirectPanel onSelectItem={setSelected} onAction={handleAction} /> },
    { id: "skills", title: "Skills", icon: ENTITY_ICONS.skill, panel: <SkillsPanel onSelectItem={setSelected} onAction={handleAction} /> },
    { id: "agents", title: "Agents", icon: ENTITY_ICONS.agent, panel: <AgentsPanel onSelectItem={setSelected} onAction={handleAction} /> },
    { id: "hooks", title: "Hooks", icon: ENTITY_ICONS.hook, panel: <HooksPanel onSelectItem={setSelected} onAction={handleAction} /> },
    { id: "memory", title: "Memory", icon: BrainIcon, panel: <MemoryPanel onSelectItem={setSelected} /> },
    { id: "lsp", title: "LSP Servers", icon: CodeIcon, panel: <LspServersPanel /> },
  ]

  return (
    <>
      {/* 보드 — 수평 스크롤 */}
      <div className="h-full overflow-x-auto overflow-y-hidden p-3">
        <div className="flex gap-3 h-full">
          {columnDefs.map((col) => (
            <BoardColumn key={col.id} id={col.id} title={col.title} icon={col.icon}>
              {col.panel}
            </BoardColumn>
          ))}
        </div>
      </div>

      {/* 디테일 드로어 — 보드 위에 오버레이 */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-1/2 min-w-[400px] sm:max-w-none p-0 flex flex-col"
        >
          <DetailPanelContent
            target={selected}
            activeProjectPath={activeProjectPath}
            onClose={() => setSelected(null)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
```

### Step 3: DetailPanelContent 분리

기존 `ProjectOverviewGrid.tsx` 안에 있던 `DetailPanelContent`를 별도 파일로 추출:

```tsx
// src/features/dashboard/components/DetailPanelContent.tsx
import { HookDetailPanel } from "@/components/HookDetailPanel"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { PluginDetailPanel } from "@/components/PluginDetailPanel"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import { AgentDetailPanel } from "@/features/agents-editor/components/AgentDetailPanel"
import type { DashboardDetailTarget } from "../types"
import { MemoryDetailPanel } from "./MemoryDetailPanel"

interface DetailPanelContentProps {
  target: DashboardDetailTarget
  activeProjectPath?: string | null
  onClose?: () => void
}

export function DetailPanelContent({
  target,
  activeProjectPath,
  onClose,
}: DetailPanelContentProps) {
  if (!target) return null
  switch (target.type) {
    case "plugin":
      return <PluginDetailPanel plugin={target.plugin} />
    case "skill":
      return <SkillDetailPanel skill={target.skill} />
    case "agent":
      return <AgentDetailPanel agent={target.agent} />
    case "mcp":
      return <McpDetailPanel server={target.server} onClose={onClose} />
    case "hook":
      return (
        <HookDetailPanel
          hook={target.hook}
          event={target.event}
          matcher={target.matcher}
          activeProjectPath={activeProjectPath}
        />
      )
    case "memory":
      return <MemoryDetailPanel file={target.file} />
  }
}
```

### Step 4: 기존 패널 수정 — OverviewPanel 래퍼 제거

각 패널에서 `<OverviewPanel>` 래퍼를 제거하고, 내부 콘텐츠만 렌더링하도록 수정한다. 열 헤더와 스크롤은 `BoardColumn`이 담당하므로.

**SkillsPanel 수정 예시:**

```tsx
// 변경 전:
<OverviewPanel title="Skills" count={files.length} href={href}>
  {/* ... content ... */}
</OverviewPanel>

// 변경 후: (OverviewPanel 없이 콘텐츠만)
<>
  {files.length === 0 ? (
    <p className="text-xs text-muted-foreground px-2 py-2">No skills</p>
  ) : (
    <div>
      {groups.map(({ scope, items }) => (
        <BoardScopeGroup key={scope} scope={scope} count={items.length}>
          {items.map((file) => {
            // ... ListItem 렌더링 (기존 동일)
          })}
        </BoardScopeGroup>
      ))}
    </div>
  )}
</>
```

기존 `ScopeGroup` → `BoardScopeGroup` 교체 (collapsible 지원).

**모든 패널 동일하게 수정:**
- `PluginsPanel.tsx` — OverviewPanel 제거, BoardScopeGroup 사용
- `McpDirectPanel.tsx` — OverviewPanel 제거, BoardScopeGroup 사용
- `HooksPanel.tsx` — OverviewPanel 제거, BoardScopeGroup 사용
- `AgentsPanel.tsx` — OverviewPanel 제거, BoardScopeGroup 사용
- `MemoryPanel.tsx` — OverviewPanel 제거
- `LspServersPanel.tsx` — OverviewPanel 제거

**주의:** `href` prop은 더 이상 필요 없음 (열 헤더에서 처리하지 않음).

### Step 5: ProjectOverviewGrid 교체

```tsx
// src/features/dashboard/components/ProjectOverviewGrid.tsx
// 기존 내용 전체를 BoardLayout으로 교체
export { BoardLayout as ProjectOverviewGrid } from "./BoardLayout"
```

또는 `src/routes/index.tsx`에서 직접 `BoardLayout`을 import.

### Step 6: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### Step 7: 수동 확인

- 수평 스크롤이 잘 작동하는지
- 각 열이 280px 최소 너비로 표시되는지
- 열 내부에서 세로 스크롤이 되는지
- Scope 서브그룹이 collapsible한지
- 아이템 클릭 시 Sheet 드로어가 오버레이로 표시되는지
- 보드가 줄어들지 않는지 (드로어가 위에 표시)

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(board): replace grid dashboard with horizontal board layout`

---

## Task 3: 열 표시/숨김 토글

> 헤더에서 열을 표시/숨김할 수 있게 하고, LSP는 아이템 없으면 기본 숨김.

**Files:**
- Create: `src/features/dashboard/components/BoardColumnSettings.tsx` — 열 설정 드롭다운
- Create: `src/features/dashboard/hooks/use-board-config.ts` — React Query 훅
- Modify: `src/features/dashboard/components/BoardLayout.tsx` — 설정 연동
- Modify: `src/components/layout/AppHeader.tsx` — 설정 버튼 추가

### Step 1: React Query 훅

```typescript
// src/features/dashboard/hooks/use-board-config.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { BoardConfig, BoardColumnId } from "@/shared/types"

export function useBoardConfig() {
  const queryClient = useQueryClient()

  const { data: boardConfig } = useQuery({
    queryKey: ["boardConfig"],
    queryFn: async () => {
      const { getBoardConfigFn } = await import("@/server/agent-config")
      return getBoardConfigFn()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<BoardConfig>) => {
      const { updateBoardConfigFn } = await import("@/server/agent-config")
      return updateBoardConfigFn({ data: partial as any })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardConfig"] })
    },
  })

  const toggleColumn = (id: BoardColumnId) => {
    if (!boardConfig) return
    const hidden = boardConfig.hiddenColumns.includes(id)
      ? boardConfig.hiddenColumns.filter((c) => c !== id)
      : [...boardConfig.hiddenColumns, id]
    updateMutation.mutate({ hiddenColumns: hidden })
  }

  const setColumnOrder = (order: BoardColumnId[]) => {
    updateMutation.mutate({ columnOrder: order })
  }

  return { boardConfig, toggleColumn, setColumnOrder }
}
```

### Step 2: 열 설정 드롭다운

```tsx
// src/features/dashboard/components/BoardColumnSettings.tsx
import { ColumnsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BoardColumnId } from "@/shared/types"
import { ENTITY_ICONS } from "@/lib/entity-icons"

const COLUMN_LABELS: Record<BoardColumnId, string> = {
  files: "Files",
  plugins: "Plugins",
  mcp: "MCP Servers",
  skills: "Skills",
  agents: "Agents",
  hooks: "Hooks",
  memory: "Memory",
  lsp: "LSP Servers",
}

interface BoardColumnSettingsProps {
  hiddenColumns: BoardColumnId[]
  onToggle: (id: BoardColumnId) => void
}

export function BoardColumnSettings({
  hiddenColumns,
  onToggle,
}: BoardColumnSettingsProps) {
  const allColumns: BoardColumnId[] = [
    "files", "plugins", "mcp", "skills", "agents", "hooks", "memory", "lsp",
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <ColumnsIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={!hiddenColumns.includes(id)}
            onCheckedChange={() => onToggle(id)}
          >
            {COLUMN_LABELS[id]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 3: BoardLayout에 설정 연동

`BoardLayout.tsx`에서:
- `useBoardConfig()` 훅으로 설정 읽기
- `columnOrder`에 따라 열 정렬
- `hiddenColumns`에 포함된 열 제외
- LSP 열은 아이템이 0개일 때 자동으로 `hiddenColumns`에 추가

### Step 4: AppHeader에 설정 버튼 추가

```tsx
// AppHeader.tsx에 BoardColumnSettings 추가
<BoardColumnSettings
  hiddenColumns={boardConfig?.hiddenColumns ?? []}
  onToggle={toggleColumn}
/>
```

### Step 5: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(board): add column visibility toggle with persistence`

---

## Task 4: 열 드래그 순서 변경

> 열을 드래그하여 순서를 변경하고, agentfiles.json에 저장한다.

**Files:**
- Modify: `package.json` — @dnd-kit 의존성 추가
- Modify: `src/features/dashboard/components/BoardLayout.tsx` — DnD 래핑
- Modify: `src/features/dashboard/components/BoardColumn.tsx` — draggable 속성

### Step 1: 의존성 설치

Run: `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### Step 2: BoardLayout에 DnD 컨텍스트 추가

```tsx
// BoardLayout.tsx — DnD 래핑
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"

// BoardLayout 내부:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor),
)

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (!over || active.id === over.id || !boardConfig) return
  const oldIndex = visibleColumns.findIndex((c) => c.id === active.id)
  const newIndex = visibleColumns.findIndex((c) => c.id === over.id)
  const newOrder = arrayMove(
    boardConfig.columnOrder,
    boardConfig.columnOrder.indexOf(active.id as BoardColumnId),
    boardConfig.columnOrder.indexOf(over.id as BoardColumnId),
  )
  setColumnOrder(newOrder)
}

return (
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
      <div className="h-full overflow-x-auto overflow-y-hidden p-3">
        <div className="flex gap-3 h-full">
          {visibleColumns.map((col) => (
            <SortableBoardColumn key={col.id} {...col} />
          ))}
        </div>
      </div>
    </SortableContext>
  </DndContext>
)
```

### Step 3: BoardColumn에 sortable 속성 추가

```tsx
// BoardColumn.tsx — useSortable 래핑
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function SortableBoardColumn(props: BoardColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BoardColumn {...props} dragListeners={listeners} />
    </div>
  )
}
```

열 헤더 영역에 `{...dragListeners}`를 적용하여 헤더를 잡고 드래그할 수 있게 한다.

### Step 4: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### Step 5: 수동 확인

- 열 헤더를 잡고 드래그하여 순서 변경
- 순서 변경 후 페이지 새로고침해도 유지
- 드래그 중 시각적 피드백 (반투명)

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(board): add column drag reorder with persistence`

---

## Task 5: Files 열

> CLAUDE.md, AGENTS.md 등을 탐색하는 Files 열을 추가한다.

**Files:**
- Create: `src/services/files-browser-service.ts` — 파일/폴더 탐색
- Create: `src/server/files-browser.ts` — 서버 함수
- Create: `src/features/dashboard/components/FilesColumn.tsx` — UI
- Create: `tests/unit/files-browser.test.ts` — 테스트

### Step 1: 테스트 작성

```typescript
// tests/unit/files-browser.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}))

vi.mock("@/services/config-service", () => ({
  getGlobalConfigPath: vi.fn(() => "/home/user/.claude"),
  getProjectConfigPath: vi.fn(() => "/project/.claude"),
}))

import fs from "node:fs/promises"
import { browseFiles } from "@/services/files-browser-service"

describe("files-browser-service", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns global config files for user scope", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "settings.json", isFile: () => true, isDirectory: () => false },
      { name: "CLAUDE.md", isFile: () => true, isDirectory: () => false },
      { name: "skills", isFile: () => false, isDirectory: () => true },
    ] as any)
    vi.mocked(fs.stat).mockResolvedValue({ size: 100, mtime: new Date() } as any)

    const result = await browseFiles("user")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns project root files and .claude directory for project scope", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "CLAUDE.md", isFile: () => true, isDirectory: () => false },
    ] as any)
    vi.mocked(fs.stat).mockResolvedValue({ size: 200, mtime: new Date() } as any)

    const result = await browseFiles("project", "/project")
    expect(result.length).toBeGreaterThan(0)
  })
})
```

### Step 2: 파일 탐색 서비스

```typescript
// src/services/files-browser-service.ts
import fs from "node:fs/promises"
import path from "node:path"
import {
  getGlobalConfigPath,
  getProjectConfigPath,
} from "@/services/config-service"

export interface BrowseFileEntry {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  lastModified?: string
}

// 무시할 폴더 (이미 다른 열에서 표시)
const IGNORE_DIRS = new Set(["skills", "agents", "plugins", "commands", "projects"])
// 무시할 파일 (설정 전용)
const IGNORE_FILES = new Set(["agentfiles.json"])

export async function browseFiles(
  scope: "user" | "project",
  projectPath?: string,
): Promise<BrowseFileEntry[]> {
  const entries: BrowseFileEntry[] = []

  if (scope === "user") {
    // ~/.claude/ 디렉토리 탐색
    const globalPath = getGlobalConfigPath()
    await scanDirectory(globalPath, entries)
  } else {
    // 프로젝트 루트의 CLAUDE.md, AGENTS.md
    const root = projectPath ?? process.cwd()
    for (const name of ["CLAUDE.md", "AGENTS.md"]) {
      const filePath = path.join(root, name)
      try {
        const stat = await fs.stat(filePath)
        entries.push({
          name,
          path: filePath,
          type: "file",
          size: stat.size,
          lastModified: stat.mtime.toISOString(),
        })
      } catch { /* 파일 없으면 건너뛰기 */ }
    }
    // .claude/ 디렉토리 탐색
    const projectConfigPath = getProjectConfigPath(projectPath)
    await scanDirectory(projectConfigPath, entries)
  }

  return entries
}

async function scanDirectory(
  dirPath: string,
  entries: BrowseFileEntry[],
): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    for (const item of items) {
      if (IGNORE_DIRS.has(item.name) || IGNORE_FILES.has(item.name)) continue
      if (item.name.startsWith(".")) continue

      const fullPath = path.join(dirPath, item.name)
      if (item.isFile()) {
        const stat = await fs.stat(fullPath)
        entries.push({
          name: item.name,
          path: fullPath,
          type: "file",
          size: stat.size,
          lastModified: stat.mtime.toISOString(),
        })
      } else if (item.isDirectory()) {
        entries.push({ name: item.name, path: fullPath, type: "directory" })
      }
    }
  } catch { /* 디렉토리 없으면 건너뛰기 */ }
}
```

### Step 3: 서버 함수 + React Query 훅

```typescript
// src/server/files-browser.ts
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const browseFilesFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: z.enum(["user", "project"]),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { browseFiles } = await import("@/services/files-browser-service")
    return browseFiles(data.scope, data.projectPath)
  })
```

### Step 4: FilesColumn UI

```tsx
// src/features/dashboard/components/FilesColumn.tsx
import { FileIcon, FolderIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { ListItem } from "@/components/ui/list-item"
import { BoardScopeGroup } from "./BoardColumn"

export function FilesColumnContent({
  onSelectItem,
}: {
  onSelectItem?: (target: any) => void
}) {
  const { activeProjectPath } = useProjectContext()

  const { data: userFiles = [] } = useQuery({
    queryKey: ["browseFiles", "user"],
    queryFn: async () => {
      const { browseFilesFn } = await import("@/server/files-browser")
      return browseFilesFn({ data: { scope: "user" } })
    },
  })

  const { data: projectFiles = [] } = useQuery({
    queryKey: ["browseFiles", "project", activeProjectPath],
    queryFn: async () => {
      if (!activeProjectPath) return []
      const { browseFilesFn } = await import("@/server/files-browser")
      return browseFilesFn({ data: { scope: "project", projectPath: activeProjectPath } })
    },
    enabled: !!activeProjectPath,
  })

  return (
    <>
      <BoardScopeGroup scope="user" count={userFiles.length}>
        {userFiles.map((file) => (
          <ListItem
            key={file.path}
            icon={file.type === "directory" ? FolderIcon : FileIcon}
            label={file.name}
            onClick={() => onSelectItem?.({ type: "file" as any, file })}
          />
        ))}
      </BoardScopeGroup>

      {activeProjectPath && (
        <BoardScopeGroup scope="project" count={projectFiles.length}>
          {projectFiles.map((file) => (
            <ListItem
              key={file.path}
              icon={file.type === "directory" ? FolderIcon : FileIcon}
              label={file.name}
              onClick={() => onSelectItem?.({ type: "file" as any, file })}
            />
          ))}
        </BoardScopeGroup>
      )}
    </>
  )
}
```

### Step 5: DashboardDetailTarget에 file 타입 추가

`src/features/dashboard/types.ts` 수정:

```typescript
import type { BrowseFileEntry } from "@/services/files-browser-service"

export type DashboardDetailTarget =
  | { type: "plugin"; plugin: Plugin }
  | { type: "skill"; skill: AgentFile }
  | { type: "agent"; agent: AgentFile }
  | { type: "mcp"; server: McpServer }
  | { type: "hook"; hook: HookEntry; event: string; matcher?: string; scope?: HookScope }
  | { type: "memory"; file: MemoryFile }
  | { type: "file"; file: BrowseFileEntry }
  | null
```

### Step 6: DetailPanelContent에 file 케이스 추가

```tsx
case "file":
  return <FileDetailPanel file={target.file} />
```

`FileDetailPanel`은 파일 내용을 읽어서 보여주는 간단한 패널 (기존 `readFileContentFn` 사용).

### Step 7: BoardLayout에 Files 열 추가

```tsx
const columnDefs = [
  { id: "files", title: "Files", icon: FileTextIcon, panel: <FilesColumnContent onSelectItem={setSelected} /> },
  // ... 기존 열들 ...
]
```

### Step 8: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(board): add Files column with scope-based file browsing`

---

## Task 6: 마무리 정리

> 기존 그리드 레이아웃 관련 코드 정리 및 불필요한 파일 제거.

**Files:**
- Delete or archive: 기존 `OverviewPanel.tsx` (더 이상 사용하지 않는 경우)
- Delete: `DashboardDetailSheet.tsx` (Sheet이 BoardLayout에 통합됨)
- Clean up: 미사용 import, 미사용 `href` props, `useIsWideScreen` 등
- Modify: `ScopeGroup.tsx` — 더 이상 대시보드에서 사용하지 않으면 정리 (단, 다른 페이지에서 사용 중이면 유지)

### Step 1: 미사용 코드 확인

각 삭제 대상 파일이 다른 곳에서 import되는지 확인:

```bash
pnpm exec grep -r "OverviewPanel" src/ --include="*.tsx" --include="*.ts"
pnpm exec grep -r "DashboardDetailSheet" src/ --include="*.tsx" --include="*.ts"
pnpm exec grep -r "useIsWideScreen" src/ --include="*.tsx" --include="*.ts"
```

### Step 2: 미사용 파일 제거 또는 보존

- `OverviewPanel.tsx` — 다른 페이지에서 사용 중이면 유지
- `DashboardDetailSheet.tsx` — 기능이 BoardLayout에 통합되었으므로 제거
- `ScopeGroup.tsx` — 다른 feature (skills-editor, hooks-editor)에서 사용 중이면 유지

### Step 3: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `refactor(board): clean up legacy grid layout code`

---

## 검증 체크리스트

모든 Task 완료 후 최종 확인:

- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 전체 통과
- [ ] `pnpm build` 성공
- [ ] 수평 스크롤 보드 작동 (각 열 280px min-width)
- [ ] 열 내부 세로 스크롤 작동
- [ ] Scope 서브그룹 collapse/expand 작동
- [ ] 아이템 선택 시 Sheet 드로어 오버레이 표시 (~50% 너비)
- [ ] 드로어 열려도 보드 줄어들지 않음
- [ ] 열 표시/숨김 토글 작동 + 새로고침 후 유지
- [ ] LSP 열 아이템 없으면 기본 숨김
- [ ] 열 드래그 순서 변경 + 새로고침 후 유지
- [ ] Files 열 User/Project 스코프별 파일 표시
- [ ] Plugin 트리 클릭 → 적절한 디테일 패널
- [ ] 기존 기능 정상 동작 (프로젝트 전환, 액션 메뉴, 삭제)

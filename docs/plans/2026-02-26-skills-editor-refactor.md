# Skills Editor Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** skills-editor를 plugins-editor 패턴(EDITOR-GUIDE.md)에 맞춰 리팩토링

**Architecture:** Context로 선택 상태를 중앙화하고, React Query 훅을 queries 파일로 분리하고, ActionBar를 독립 컴포넌트로 추출한다. 기존 `@/server/items` 공유 서버 함수는 유지하되 queries 레이어에서 래핑한다.

**Tech Stack:** React 19, TanStack Query, TanStack Start, Zod, shadcn/ui

---

### Task 1: `types.ts` 생성 + `constants.tsx` → `constants.ts` 분리

**Files:**
- Create: `src/features/skills-editor/types.ts`
- Create: `src/features/skills-editor/components/FrontmatterBadges.tsx`
- Modify: `src/features/skills-editor/constants.tsx` → rename to `constants.ts`

**Step 1: `types.ts` 생성**

```typescript
// src/features/skills-editor/types.ts
import type { AgentFile, SupportingFile } from "@/shared/types"

export interface SkillSelection {
  skill: AgentFile | null
  supportingFile: SupportingFile | null
  expandedSkillPath: string | null
}
```

**Step 2: FrontmatterBadges를 컴포넌트 파일로 이동**

`src/features/skills-editor/components/FrontmatterBadges.tsx` — constants.tsx의 `FrontmatterBadges` 함수를 그대로 이동. import 경로만 변경.

**Step 3: `constants.tsx` → `constants.ts` 리네이밍**

- FrontmatterBadges 제거 (이동 완료)
- Badge, Separator import 제거
- 파일 확장자 `.tsx` → `.ts` 변경
- `extractBody`, `addSkillSchema`만 남김

**Step 4: import 경로 업데이트**

- `SkillDetailPanel.tsx`: `FrontmatterBadges` import를 `../components/FrontmatterBadges`로 변경
- `SupportingFilePanel.tsx`, `AddSkillDialog.tsx`: `../constants` import 경로 변경 없음 (확장자 자동)

**Step 5: 검증**

```bash
pnpm typecheck && pnpm lint
```

**Step 6: 커밋**

```bash
git add src/features/skills-editor/
git commit -m "refactor(skills): extract types.ts, move FrontmatterBadges to component"
```

---

### Task 2: `skills.queries.ts` 생성

**Files:**
- Create: `src/features/skills-editor/api/skills.queries.ts`

**Step 1: queries 파일 작성**

```typescript
// src/features/skills-editor/api/skills.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type { Scope } from "@/shared/types"
import {
  createSkillFn,
  readSupportingFileFn,
  saveFrontmatterFn,
} from "./skills.functions"

export function useSkillsQuery() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.agentFiles.byTypeAndProject("skill", activeProjectPath),
    queryFn: async () => {
      const { getItemsFn } = await import("@/server/items")
      return getItemsFn({ data: { type: "skill", projectPath: activeProjectPath } })
    },
    ...FREQUENT_REFETCH,
  })
}

export function useSkillDetailQuery(skillPath: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agentFiles.detail(skillPath ?? ""),
    queryFn: async () => {
      if (!skillPath) return null
      const { getItemFn } = await import("@/server/items")
      // getItemFn expects type/name/scope — but we need path-based lookup
      // We use the raw file read approach from skills.functions instead
      const fs = await import("node:fs/promises")
      const content = await fs.readFile(skillPath, "utf-8")
      return { content, path: skillPath }
    },
    enabled: !!skillPath,
  })
}

export function useSupportingFileQuery(
  skillPath: string | undefined,
  relativePath: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.agentFiles.supportingFile(
      skillPath ?? "",
      relativePath ?? "",
    ),
    queryFn: () =>
      readSupportingFileFn({
        data: { skillPath: skillPath!, relativePath: relativePath! },
      }),
    enabled: !!skillPath && !!relativePath,
  })
}

export function useSkillMutations() {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.agentFiles.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const createMutation = useMutation({
    mutationFn: (params: {
      name: string
      scope: Scope
      description?: string
    }) =>
      createSkillFn({
        data: { ...params, projectPath: activeProjectPath ?? undefined },
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: { name: string; scope: Scope }) => {
      const { deleteItemFn } = await import("@/server/items")
      return deleteItemFn({
        data: {
          type: "skill",
          ...params,
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    onSuccess: invalidate,
  })

  const saveFrontmatterMutation = useMutation({
    mutationFn: (params: {
      filePath: string
      frontmatter: Record<string, unknown>
    }) => saveFrontmatterFn({ data: params }),
    onSuccess: invalidate,
  })

  return { createMutation, deleteMutation, saveFrontmatterMutation }
}
```

**주의:** `useSkillDetailQuery`에서 `getItemFn`은 name/scope 기반 조회인데, skills는 path 기반 조회가 필요하다. 기존 `SkillDetailPanel`이 `getItemFn`을 사용하므로 동일하게 유지한다.

실제로는 기존 패턴을 유지해서 `getItemFn` 호출:

```typescript
export function useSkillDetailQuery(skill: { name: string; type: string; scope: string; path: string } | null, projectPath?: string) {
  return useQuery({
    queryKey: queryKeys.agentFiles.detail(skill?.path ?? ""),
    queryFn: async () => {
      if (!skill) return null
      const { getItemFn } = await import("@/server/items")
      return getItemFn({
        data: {
          type: skill.type as "skill" | "command" | "agent",
          name: skill.name,
          scope: skill.scope as "global" | "project",
          projectPath,
        },
      })
    },
    enabled: !!skill,
  })
}
```

**Step 2: 검증**

```bash
pnpm typecheck
```

**Step 3: 커밋**

```bash
git add src/features/skills-editor/api/skills.queries.ts
git commit -m "refactor(skills): add skills.queries.ts with query/mutation hooks"
```

---

### Task 3: `context/SkillsContext.tsx` 생성

**Files:**
- Create: `src/features/skills-editor/context/SkillsContext.tsx`

**Step 1: Context 파일 작성**

PluginsContext 패턴을 따르되 skills 도메인에 맞게 조정:

```typescript
// src/features/skills-editor/context/SkillsContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"
import { useSkillsQuery } from "../api/skills.queries"

export interface SkillsContextValue {
  // Data
  skills: AgentFile[] | undefined

  // Selection state
  selectedSkill: AgentFile | null
  selectedSupportingFile: SupportingFile | null
  expandedSkillPath: string | null

  // Handlers
  handleSelectSkill: (skill: AgentFile) => void
  handleSelectSupportingFile: (sf: SupportingFile | null) => void
  handleExpandSkill: (path: string | null) => void
  handleClearSelection: () => void

  // Add dialog state
  addDialogOpen: boolean
  addDialogScope: Scope
  handleAddClick: (scope: Scope) => void
  handleAddClose: () => void
}

const SkillsContext = createContext<SkillsContextValue | null>(null)

export function useSkillsSelection(): SkillsContextValue {
  const ctx = useContext(SkillsContext)
  if (!ctx) {
    throw new Error("useSkillsSelection must be used within SkillsProvider")
  }
  return ctx
}

export function SkillsProvider({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
  const [selectedSupportingFile, setSelectedSupportingFile] =
    useState<SupportingFile | null>(null)
  const [expandedSkillPath, setExpandedSkillPath] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

  const { data: skills } = useSkillsQuery()

  // Auto-clear stale selection
  useEffect(() => {
    if (
      selectedSkill &&
      skills &&
      !skills.some((s) => s.path === selectedSkill.path)
    ) {
      setSelectedSkill(null)
      setSelectedSupportingFile(null)
      setExpandedSkillPath(null)
    }
  }, [skills, selectedSkill])

  const handleSelectSkill = useCallback(
    (skill: AgentFile) => {
      setSelectedSkill(skill)
      setSelectedSupportingFile(null)
      const hasSF =
        skill.isSkillDir &&
        skill.supportingFiles &&
        skill.supportingFiles.length > 0
      if (!hasSF) {
        setExpandedSkillPath(null)
      }
      onSelect?.()
    },
    [onSelect],
  )

  const handleSelectSupportingFile = useCallback(
    (sf: SupportingFile | null) => {
      setSelectedSupportingFile(sf)
      onSelect?.()
    },
    [onSelect],
  )

  const handleExpandSkill = useCallback(
    (path: string | null) => setExpandedSkillPath(path),
    [],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedSkill(null)
    setSelectedSupportingFile(null)
    setExpandedSkillPath(null)
  }, [])

  const handleAddClick = useCallback((scope: Scope) => {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }, [])

  const handleAddClose = useCallback(() => setAddDialogOpen(false), [])

  const value = useMemo(
    () => ({
      skills,
      selectedSkill,
      selectedSupportingFile,
      expandedSkillPath,
      handleSelectSkill,
      handleSelectSupportingFile,
      handleExpandSkill,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    }),
    [
      skills,
      selectedSkill,
      selectedSupportingFile,
      expandedSkillPath,
      handleSelectSkill,
      handleSelectSupportingFile,
      handleExpandSkill,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    ],
  )

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  )
}
```

**Step 2: 검증**

```bash
pnpm typecheck
```

**Step 3: 커밋**

```bash
git add src/features/skills-editor/context/
git commit -m "refactor(skills): add SkillsContext for centralized selection state"
```

---

### Task 4: `SkillActionBar.tsx` 추출

**Files:**
- Create: `src/features/skills-editor/components/SkillActionBar.tsx`

**Step 1: SkillDetailPanel 헤더 영역을 독립 컴포넌트로 추출**

```typescript
// src/features/skills-editor/components/SkillActionBar.tsx
import { FolderOpen, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"
import { useSkillMutations } from "../api/skills.queries"

interface SkillActionBarProps {
  skill: AgentFile
  onDeleted?: () => void
}

export function SkillActionBar({ skill, onDeleted }: SkillActionBarProps) {
  const { deleteMutation } = useSkillMutations()
  const [pendingDelete, setPendingDelete] = useState(false)

  async function handleOpenInEditor(editor: "code" | "cursor") {
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath: skill.path, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  async function handleOpenFolder() {
    try {
      const { openFolderFn } = await import("@/server/editor")
      const dirPath = skill.path.replace(/\/SKILL\.md$/, "")
      await openFolderFn({ data: { dirPath } })
    } catch {
      toast.error("Failed to open folder")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {skill.name}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              {m.skills_edit()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              <VscodeIcon className="size-4" />
              {m.skills_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              <CursorIcon className="size-4" />
              {m.skills_open_cursor()}
            </DropdownMenuItem>
            {skill.isSkillDir && (
              <DropdownMenuItem onClick={handleOpenFolder}>
                <FolderOpen className="size-4" />
                {m.skills_open_folder()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(true)}
            >
              <Trash2 className="size-4" />
              {m.skills_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.skills_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.skills_delete_confirm({ name: skill.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(
                  { name: skill.name, scope: skill.scope },
                  {
                    onSuccess: () => {
                      setPendingDelete(false)
                      onDeleted?.()
                    },
                    onError: (e) => {
                      setPendingDelete(false)
                      toast.error(e.message || "Failed to delete skill")
                    },
                  },
                )
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

**Step 2: 검증**

```bash
pnpm typecheck
```

**Step 3: 커밋**

```bash
git add src/features/skills-editor/components/SkillActionBar.tsx
git commit -m "refactor(skills): extract SkillActionBar component"
```

---

### Task 5: 컴포넌트 리팩토링 — SkillsPage, SkillDetailPanel, SkillsScopeSection, AddSkillDialog, SupportingFilePanel

**Files:**
- Modify: `src/features/skills-editor/components/SkillsPageContent.tsx` → rename to `SkillsPage.tsx`
- Modify: `src/features/skills-editor/components/SkillDetailPanel.tsx`
- Modify: `src/features/skills-editor/components/SkillsScopeSection.tsx`
- Modify: `src/features/skills-editor/components/AddSkillDialog.tsx`
- Modify: `src/features/skills-editor/components/SupportingFilePanel.tsx`
- Modify: `src/routes/skills/route.tsx`

**Step 1: `SkillsPageContent.tsx` → `SkillsPage.tsx` 리팩토링**

- `SkillsProvider` + `ErrorBoundary` 래퍼 추가
- 모든 useState 제거 (Context로 이동 완료)
- `useSkillsSelection()` 사용
- 라우트에서 사용하는 이름을 `SkillsPage`로 변경

핵심 구조:
```tsx
export function SkillsPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<SkillsErrorFallback />}>
      <SkillsProvider onSelect={() => setSidebarOpen(false)}>
        <SkillsPageInner />
      </SkillsProvider>
    </ErrorBoundary>
  )
}

function SkillsPageInner() {
  const [searchQuery, setSearchQuery] = useState("")
  const { skills, selectedSkill, selectedSupportingFile, addDialogOpen, ... } = useSkillsSelection()
  // ... (기존 로직에서 useState 제거, context 사용)
}
```

**Step 2: `SkillsScopeSection.tsx` 리팩토링**

- prop에서 `selectedSkill`, `selectedSupportingFile`, `expandedSkillPath`, `onSelectSkill`, `onSelectSupportingFile`, `onExpandSkill` 제거
- 대신 `useSkillsSelection()` 사용
- 남는 props: `label`, `scope`, `searchQuery`, `onAddClick`

**Step 3: `SkillDetailPanel.tsx` 리팩토링**

- 인라인 `useQuery` 제거 → `useSkillDetailQuery()` 사용
- 인라인 delete 로직 제거 → `SkillActionBar` 사용
- `handleOpenInEditor`, `handleOpenFolder`, `handleDelete` 모두 SkillActionBar로 이동 완료
- `activeProjectPath`, `onDeleted` props 제거 (Context에서 관리)

핵심 구조:
```tsx
export function SkillDetailPanel() {
  const { selectedSkill: skill, handleClearSelection } = useSkillsSelection()
  const { activeProjectPath } = useProjectContext()
  const { data: itemDetail, isLoading } = useSkillDetailQuery(skill, activeProjectPath ?? undefined)
  // ... (메타 + FileViewer 렌더링만 남김)
}
```

**Step 4: `AddSkillDialog.tsx` 리팩토링**

- 인라인 `queryClient.invalidateQueries` 제거 → `useSkillMutations().createMutation` 사용
- `activeProjectPath` prop 제거 (Context/query 내부에서 처리)

**Step 5: `SupportingFilePanel.tsx` 리팩토링**

- 인라인 `useQuery` 제거 → `useSupportingFileQuery()` 사용

**Step 6: 라우트 import 변경**

```typescript
// src/routes/skills/route.tsx
import { SkillsPage } from "@/features/skills-editor/components/SkillsPage"

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
})
```

**Step 7: 검증**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Step 8: 커밋**

```bash
git add src/features/skills-editor/ src/routes/skills/
git commit -m "refactor(skills): align editor with plugins-editor pattern (context, queries, action bar)"
```

---

### Task 6: 정리 및 최종 검증

**Files:**
- Modify: `docs/WORK.md` — 체크박스 업데이트

**Step 1: 불필요한 파일 확인**

- `SkillsPageContent.tsx` 가 남아있다면 삭제 (SkillsPage.tsx로 대체)
- `constants.tsx` 가 남아있다면 삭제 (`constants.ts`로 대체)

**Step 2: re-export 정리**

- `skills.functions.ts`의 `export { openFolderFn, openInEditorFn } from "@/server/editor"` 제거
  - SkillActionBar에서 직접 `@/server/editor` import로 변경했으므로 불필요

**Step 3: 전체 품질 검증**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Step 4: WORK.md 업데이트**

skills-editor 리팩토링 항목 체크:
```markdown
- [x] skills-editor를 plugins-editor 구조에 맞춰 리팩토링 (context, api, components 분리)
```

**Step 5: 커밋**

```bash
git add docs/WORK.md src/features/skills-editor/
git commit -m "refactor(skills): cleanup and update WORK.md"
```

---

## 주의사항

1. **dynamic import 유지**: `skills.functions.ts` handler 내부의 `await import("node:fs/promises")` 등은 절대 static으로 바꾸지 않는다.
2. **queries → functions는 static OK**: `skills.queries.ts`에서 `skills.functions.ts` import는 static 가능 (둘 다 클라이언트에서 실행).
3. **queries → @/server/* 는 dynamic 필수**: `skills.queries.ts`의 `queryFn` 내부에서 `@/server/items` import는 dynamic 유지.
4. **`useAgentFiles("skill")` 와의 관계**: 기존 `use-config.ts`의 `useAgentFiles`는 다른 곳에서도 사용될 수 있으므로 삭제하지 않는다. skills-editor 내부에서만 `useSkillsQuery`로 전환.
5. **SkillsScopeSection의 복잡성**: 이 컴포넌트는 skills + commands 를 합쳐서 보여주는 복잡한 트리 로직이 있다. Context 전환 시 기존 로직을 보존한다.

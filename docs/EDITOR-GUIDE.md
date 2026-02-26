# Feature Editor Architecture Guide

> Claude 전용 가이드. Feature editor 신규 작성 및 리팩토링 시 이 문서를 참조한다.
> Reference implementation: `src/features/plugins-editor/`

## 1. 디렉토리 구조

```text
src/features/{name}-editor/
├── api/
│   ├── {name}.functions.ts    # Server Functions (createServerFn)
│   └── {name}.queries.ts      # React Query 훅 (useXxxQuery, useXxxMutations)
├── components/
│   ├── {Name}Page.tsx          # 메인 페이지 (ErrorBoundary + Provider 래퍼)
│   ├── {Name}List.tsx          # 좌측 목록 패널
│   ├── {Name}ListItem.tsx      # 목록 아이템 (memo)
│   ├── {Name}ScopeSection.tsx  # 스코프별 그룹 섹션
│   └── Add{Name}Dialog.tsx     # 추가 다이얼로그
├── context/
│   └── {Name}Context.tsx       # 선택 상태 + 파생 데이터
├── types.ts                    # 로컬 도메인 타입
└── constants.ts                # 상수, 메타데이터, 헬퍼 함수
```

**규칙:**
- `constants.tsx` 금지 — 컴포넌트는 `components/`에, 상수는 `constants.ts`에 분리
- `types.ts`에 feature 로컬 타입 정의 (공유 타입은 `src/shared/types.ts`)
- 상세 패널(Header + DetailView + Actions)은 **공유 컴포넌트**로 추출 — feature 내부에 ActionBar/DetailPanel을 두지 않음 (섹션 7 참조)

## 2. Server Functions (⚠️ 핵심 규칙)

### 동적 import 필수

Server function handler 내부에서 `@/services/*` 및 `@/server/*` import는 **반드시 dynamic import** 사용:

```typescript
// ✅ 올바른 패턴
export const getPluginsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { getPlugins } = await import("@/services/plugin-service")
    const projectPath = data.projectPath
      ? validateProjectPath(data.projectPath)
      : undefined
    return getPlugins(projectPath)
  })

// ❌ 금지 패턴 — Node.js 모듈이 클라이언트 번들에 포함되어 런타임 깨짐
import { getPlugins } from "@/services/plugin-service"   // node:fs 사용
import { pluginToggle } from "@/services/claude-cli"     // node:child_process 사용
```

**이유:** TanStack Start의 `createServerFn`은 handler 코드를 서버에서 실행하지만, 모듈 최상위 static import는 클라이언트 번들에도 포함된다. `node:fs`, `node:child_process` 등 Node.js 전용 모듈이 포함되면 클라이언트에서 module resolution이 실패한다.

### 허용되는 static import

```typescript
// ✅ 서버/클라이언트 양쪽에서 사용 가능한 것만 static import
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
```

### 패턴

```typescript
// {name}.functions.ts 표준 구조
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

// Zod 스키마 — 재사용 가능하면 파일 상단에 정의
const scopeSchema = z.enum(["user", "project", "local", "managed"])

export const getFooFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { getFoo } = await import("@/services/foo-service")
    // ...
  })

export const mutateFooFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), scope: scopeSchema.optional() }))
  .handler(async ({ data }) => {
    const { mutateFoo } = await import("@/services/claude-cli")
    await mutateFoo(data.id, data.scope)
    return { success: true }
  })
```

## 3. React Query 레이어

### queries 파일 구조

```typescript
// {name}.queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { FREQUENT_REFETCH } from "@/hooks/use-config"
import {
  getFooFn,
  mutateFooFn,
} from "./{name}.functions"  // ✅ queries → functions는 static import OK

// 로컬 query key (전역 queryKeys와 별도)
const fooKeys = {
  all: ["foo"] as const,
  list: (projectPath?: string) => [...fooKeys.all, "list", projectPath] as const,
}
```

### useXxxQuery — 읽기 전용

```typescript
export function useFooQuery(projectPath?: string) {
  return useQuery({
    queryKey: fooKeys.list(projectPath),
    queryFn: () => getFooFn({ data: { projectPath } }),
    ...FREQUENT_REFETCH,
  })
}
```

### useXxxMutations — 쓰기 전용, 분리

```typescript
export function useFooMutations() {
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: fooKeys.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; enable: boolean }) =>
      toggleFooFn({ data: vars }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string }) =>
      deleteFooFn({ data: vars }),
    onSuccess: invalidate,
  })

  return { toggleMutation, deleteMutation }
}
```

**규칙:**
- Query와 Mutation 훅을 분리 — 컴포넌트가 필요한 것만 import
- `onSuccess`에서 관련 queryKey + `overview.all` 동시 무효화
- 에러 처리는 mutation 호출 측에서 `onError` 콜백으로 (toast 등)
- `queries → functions` import는 static OK (둘 다 클라이언트에서 실행)

## 4. Context (선택 상태 관리)

### 구조

```typescript
// context/{Name}Context.tsx
interface FooContextValue {
  // 데이터
  items: Foo[] | undefined

  // 선택 상태
  selectedId: string | null
  selectedItem: Foo | null  // useMemo 파생

  // 파생 데이터
  groupedByScope: Map<string, Foo[]>  // useMemo
  duplicateNames: Set<string>          // useMemo (필요 시)

  // 핸들러
  handleSelect: (id: string) => void
  handleClearSelection: () => void
}
```

### 핵심 패턴

**자동 정리 (stale selection cleanup):**
```typescript
useEffect(() => {
  if (selectedId && items && !items.some(item => item.id === selectedId)) {
    setSelectedId(null)
  }
}, [items, selectedId])
```

**스코프 그룹화:**
```typescript
const groupedByScope = useMemo(() => {
  const map = new Map<string, Foo[]>()
  for (const scope of SCOPE_ORDER) {
    const filtered = (items ?? []).filter(item => item.scope === scope)
    if (filtered.length > 0) map.set(scope, filtered)
  }
  return map
}, [items])
```

**Provider 배치:**
```typescript
// {Name}Page.tsx
export function FooPage() {
  return (
    <ErrorBoundary fallback={<FooErrorFallback />}>
      <FooProvider>
        <FooPageInner />
      </FooProvider>
    </ErrorBoundary>
  )
}
```

## 5. UI/UX 패턴

### 레이아웃

**기본 2분할 (Skills, Hooks, Files):**
```text
┌─── 좌측 (280px, 고정) ──────┬─── 우측 (flex-1) ──────────────┐
│  헤더 (h-12, border-b)      │  ActionBar (h-12, border-b)    │
│  검색 (Input)                │                                │
│  목록 (overflow-y-auto)      │  상세 (overflow-y-auto, p-4)   │
└──────────────────────────────┴────────────────────────────────┘
```

**확장 3분할 (Plugins — 하위 항목이 있는 경우):**
```text
┌── 좌측 (280px) ─┬── 중간 (260px) ──┬── 우측 (flex-1) ──────────┐
│ 플러그인 목록    │ 컴포넌트 목록    │ 상세 뷰                    │
└──────────────────┴──────────────────┴────────────────────────────┘
```

### 좌측 패널 규격

```tsx
<div className="w-[280px] shrink-0 border-r border-border flex flex-col">
  {/* 헤더: h-12 고정 */}
  <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
    <h2 className="text-sm font-semibold">{title}</h2>
    <Button size="icon" variant="ghost" className="size-8">
      <Plus className="size-4" />
    </Button>
  </div>

  {/* 검색 + 목록 */}
  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
    <Input placeholder={m.search()} value={search} onChange={...} />
    {/* ListItem / TreeFolder / TreeFile */}
  </div>
</div>
```

### 공유 DetailPanel 패턴 (Flutter-style 콜백)

상세 패널(Header + Actions + DetailView + 삭제 확인)은 **공유 컴포넌트**로 관리한다.
feature 내부에 ActionBar/DetailPanel을 별도로 만들지 않는다.

**핵심 원칙 — 콜백 존재 = UI 표시:**

```typescript
// Flutter-style: 콜백이 있으면 해당 액션 버튼 표시, undefined이면 숨김
// boolean prop (editable, deletable) 대신 콜백 유무로 제어
interface DetailPanelProps {
  onEdit?: () => void    // 있으면 "Edit" 메뉴 표시
  onDelete?: () => void  // 있으면 "Delete" 메뉴 + 확인 다이얼로그
  filePath?: string      // 있으면 "Open in Editor" 메뉴 표시
}
```

**사용 예시:**

```tsx
// hooks-editor: 편집 + 삭제 가능
<HookDetailPanel
  hook={selectedHook.hook}
  event={selectedHook.event}
  matcher={selectedHook.matcher}
  filePath={resolvedFilePath}
  onEdit={() => setEditingHook(selectedHook)}
  onDelete={handleDeleteHook}
/>

// plugins-editor: 읽기 전용 (콜백 없음 → 버튼 없음)
<HookDetailPanel
  hook={hook}
  event={event}
  matcher={group.matcher}
  filePath={resolvedPath}
/>

// skills-editor: 삭제만 가능
<SkillDetailPanel skill={selectedSkill} onDelete={handleDeleteSkill} />

// plugins-editor: 읽기 전용
<SkillDetailPanel skill={file} />
```

**Mutation 소유권:** 부모 컴포넌트(Page)가 mutation을 소유하고, 콜백으로 패널에 전달한다. 패널은 삭제 확인 AlertDialog UI만 내부 관리.

### 삭제 확인 다이얼로그

삭제 확인은 공유 DetailPanel **내부**에서 관리 (외부 state 불필요):

```tsx
// DetailPanel 내부
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

{onDelete && (
  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{m.delete_title()}</AlertDialogTitle>
        <AlertDialogDescription>{m.delete_confirm({ name })}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
        <AlertDialogAction onClick={() => {
          onDelete()
          setShowDeleteConfirm(false)
        }}>
          {m.delete()}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

### 빈 상태

선택 없음, 검색 결과 없음 시 빈 상태 메시지 표시:

```tsx
<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
  {m.select_item_hint()}
</div>
```

### 로딩 상태

```tsx
{isLoading ? (
  <div className="p-4 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-2/3" />
  </div>
) : (
  <ActualContent />
)}
```

## 6. 공통 원칙

### 상수 구조

```typescript
// constants.ts
export const SCOPE_ORDER: readonly FooScope[] = ["user", "project", "local", "managed"]

export const SCOPE_LABELS: Record<FooScope, () => string> = {
  user: () => m.scope_user(),
  project: () => m.scope_project(),
  local: () => m.scope_local(),
  managed: () => m.scope_managed(),
}

// 메타데이터 — 아이콘, i18n 레이블, 설명 등
export const FOO_TYPE_META: Record<FooType, {
  icon: LucideIcon
  labelFn: () => string
  descriptionFn: () => string
}> = { ... }
```

### i18n

- 모든 UI 텍스트는 `m.xxx()` 함수 사용 (`@/paraglide/messages`)
- 키 접두사: `{feature}_` (예: `plugin_`, `skill_`, `hook_`)
- 파라미터 있는 메시지: `m.plugin_uninstall_confirm({ name: "foo" })`
- 상수 메타데이터에서는 `labelFn: () => m.xxx()` (지연 평가)

### ErrorBoundary

모든 에디터 페이지의 최외곽에 ErrorBoundary 래핑:

```tsx
function FooErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-destructive">
      {m.error_loading_page()}
    </div>
  )
}

export function FooPage() {
  return (
    <ErrorBoundary fallback={<FooErrorFallback />}>
      <FooProvider>
        <FooPageInner />
      </FooProvider>
    </ErrorBoundary>
  )
}
```

### memo 최적화

목록 아이템은 `memo()`로 래핑하여 불필요한 리렌더 방지:

```tsx
export const FooListItem = memo(function FooListItem({ item, isSelected, onSelect }: Props) {
  // ...
})
```

### Open in Editor

에디터 열기 기능은 컴포넌트에서 동적 import:

```typescript
async function handleOpenInEditor(editor: "code" | "cursor") {
  if (!item.path) return
  try {
    const { openInEditorFn } = await import("@/server/editor")
    await openInEditorFn({ data: { filePath: item.path, editor } })
  } catch {
    toast.error(`Failed to open in ${editor}`)
  }
}
```

## 7. 공유 컴포넌트 및 훅

### 공유 DetailPanel 컴포넌트

```text
src/components/
  HookDetailPanel.tsx      ← Hook 상세 패널 (Header + Actions + HookDetailView + 삭제 확인)
  HookDetailView.tsx       ← Hook 상세 뷰 (메타 필드 + 스크립트 프리뷰)
  SkillDetailPanel.tsx     ← Skill/Agent/Command 상세 패널 (Header + Actions + SkillDetailView + 삭제 확인)
  SkillDetailView.tsx      ← self-fetching, AgentFile의 메타+콘텐츠 표시
```

**사용처:**
- `HookDetailPanel` → hooks-editor (편집+삭제), plugins-editor (읽기 전용)
- `SkillDetailPanel` → skills-editor (삭제), plugins-editor (읽기 전용, commands/skills/agents/outputStyles)

### 상세 뷰 컴포넌트

```text
src/components/
  AgentFileView.tsx        ← 순수 표시, 파일명+내용을 받아 FileViewer 위임
  FrontmatterBadges.tsx    ← frontmatter 키를 Badge로 시각화
  DetailField.tsx          ← 메타 필드 래퍼 (label + children)
  FileViewer.tsx           ← preview/source 토글, 복사 버튼

src/hooks/
  use-agent-file-detail.ts ← useAgentFileDetailQuery (path 기반 파일 읽기)
```

**사용 패턴:**
```tsx
// 어디서든 AgentFile 객체만 넘기면 상세 표시
<SkillDetailView skill={agentFile} />

// 파일 내용을 직접 전달하는 순수 뷰어
<AgentFileView fileName="helper.ts" rawContent={content} isLoading={loading} />
```

### 공유 유틸리티

```text
src/lib/
  hook-utils.ts            ← isHookFilePath() + resolveHookFilePath()
```

- `isHookFilePath(hook)` — hook command가 파일 경로인지 판별 (확장자, `$CLAUDE_` 변수, `.claude/` 접두사)
- `resolveHookFilePath(command, context)` — `$CLAUDE_PLUGIN_ROOT`, `$CLAUDE_PROJECT_DIR` 등 변수 해석

### 의존성 방향 규칙

```text
plugins-editor ──→ skills-editor     ✅ 허용
plugins-editor ──→ hooks-editor      ✅ 허용
skills-editor  ──→ plugins-editor    ❌ 금지
hooks-editor   ──→ plugins-editor    ❌ 금지
```

plugins가 상위 그룹(skill, hook, mcp 등을 번들)이므로 하위 참조 허용, 역방향 금지.

## 8. 금지 사항 (Anti-patterns)

| 금지 | 이유 | 올바른 방법 |
|------|------|------------|
| Server function 파일에서 `@/services/*` static import | 클라이언트 번들 깨짐 | handler 내 `await import()` |
| `constants.tsx` (JSX 포함) | 상수와 컴포넌트 혼재 | `constants.ts` + 별도 컴포넌트 파일 |
| Query와 Mutation을 하나의 훅에 합치기 | 불필요한 re-render + 커플링 | `useXxxQuery` + `useXxxMutations` 분리 |
| 선택 상태를 Page 컴포넌트에 useState로 관리 | prop drilling, 정리 로직 분산 | Context로 분리 |
| mutation `onSuccess`에서 invalidation 누락 | 스테일 데이터 | 관련 queryKey + overview.all 무효화 |
| 에러 발생 가능 영역에 ErrorBoundary 없음 | 흰 화면 | 페이지 최외곽에 ErrorBoundary 래핑 |
| feature 내부에 ActionBar/DetailPanel 중복 생성 | 로직 분산, 동작 불일치 | 공유 DetailPanel 사용 (섹션 7) |
| `editable`/`deletable` boolean prop으로 버튼 표시 제어 | prop 과다, 의도 불명확 | Flutter-style 콜백 유무로 제어 (섹션 5) |
| isFilePath 등 판별 로직을 컴포넌트에 인라인 | 중복, 불일치 | `src/lib/` 공유 유틸리티 추출 |

## 9. 체크리스트

새 에디터 작성 또는 기존 에디터 리팩토링 시:

- [ ] 디렉토리 구조가 섹션 1을 따르는가?
- [ ] Server Functions에서 Node.js 서비스를 dynamic import 하는가?
- [ ] `queries.ts`에 query/mutation 훅이 분리되어 있는가?
- [ ] Context로 선택 상태를 관리하는가?
- [ ] stale selection 자동 정리가 있는가?
- [ ] ErrorBoundary로 페이지가 래핑되어 있는가?
- [ ] 모든 UI 텍스트가 i18n 함수를 사용하는가?
- [ ] 좌측 패널이 280px, 헤더가 h-12 규격인가?
- [ ] 삭제 시 AlertDialog 확인이 있는가?
- [ ] mutation 성공 시 queryKey + overview 무효화가 있는가?
- [ ] 상세 패널이 공유 DetailPanel 컴포넌트를 사용하는가? (feature 내부 ActionBar 금지)
- [ ] 액션 버튼 표시가 Flutter-style 콜백 유무로 제어되는가? (boolean prop 금지)
- [ ] 판별/해석 로직이 `src/lib/` 공유 유틸리티에 있는가? (컴포넌트 인라인 금지)

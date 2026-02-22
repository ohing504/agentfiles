# React Best Practice 분석 보고서

> **Status**: 8/10 완료 | 마지막 검증: 2026-02-22

> 분석 대상: agentfiles v1 (TanStack Start + React 19 + shadcn/ui)
> 분석 기준: React 공식 문서, TanStack Query v5 권장 패턴, 접근성(WCAG 2.1), TypeScript strict 모드

---

## 요약

전반적으로 코드 품질이 높고 TanStack Start의 Server Function 패턴을 올바르게 활용하고 있습니다. TanStack Query를 통한 데이터 페칭, 스코프별 구분, Skeleton 로딩 UI 등 실용적인 패턴이 잘 구현되어 있습니다. 주요 개선 포인트는 다음과 같습니다: **Error Boundary 미적용**으로 인한 런타임 에러 시 전체 화면 블랙아웃 가능성, `formatDate`/`formatFileSize` 같은 **유틸리티 함수의 중복**, 그리고 접근성(ARIA) 속성이 일부 커스텀 인터랙티브 요소에 누락된 점입니다. (`ClaudeMdEditor`의 로컬 state 기반 비동기 처리는 PR #2에서 TanStack Query로 통합 완료되었습니다.) 대부분의 개선사항은 실질적인 가치를 제공하는 중간 우선순위 항목이며, 과도한 리팩토링 없이 점진적으로 적용 가능합니다.

---

## 잘 되어있는 부분

### 1. TanStack Server Function 패턴의 올바른 사용
`createServerFn`을 사용해 서버/클라이언트 경계를 명확히 분리하고 있으며, 동적 import(`await import("@/server/...")`)로 서버 코드가 클라이언트 번들에 포함되지 않도록 처리한 점이 좋습니다.

### 2. TanStack Query 캐시 무효화 전략
`useProjects`의 `setActiveMutation`에서 프로젝트 전환 시 모든 관련 쿼리 키(`overview`, `claude-md`, `mcp-servers`, `agent-files`, `plugins`)를 일괄 무효화하는 패턴이 정확합니다. 데이터 일관성이 잘 유지됩니다.

### 3. 컴포넌트 분리와 단일 책임 원칙
`StatCard`, `CliStatusBadge`, `ClaudeMdCard`, `PluginCard`, `McpServerCard`, `MetaRow` 등 작은 단위의 표현 컴포넌트로 분리되어 있어 가독성과 재사용성이 좋습니다.

### 4. 보안을 고려한 서버 사이드 유효성 검사
`validateItemName`으로 path traversal 공격을 방지하고, `startsWith(nodePath.resolve(data.projectPath))`로 파일 경로 검증을 서버에서 처리하는 점이 올바릅니다.

### 5. Skeleton UI 로딩 상태
목록 페이지(`PluginListSkeleton`, `AgentsPage`, `SkillsPage` 등)와 상세 페이지에서 일관되게 `Skeleton` 컴포넌트를 사용해 로딩 상태를 표시하고 있습니다.

### 6. 타입 정의의 명확성
`src/shared/types.ts`에 도메인 타입이 잘 정의되어 있으며, discriminated union 패턴(`"global" | "project" | "user"`)과 옵셔널 필드 처리가 적절합니다.

### 7. 폴링 설정의 중앙화
`REFETCH_OPTIONS = { refetchOnWindowFocus: true, refetchInterval: 5000 }`를 상수로 분리해 일관된 폴링 정책을 유지하는 점이 좋습니다.

### 8. `Promise.all`을 활용한 병렬 데이터 페칭
`config-service.ts`의 `getOverview`와 `getMcpServers`에서 독립적인 비동기 작업을 `Promise.all`로 병렬 처리하여 성능을 최적화하고 있습니다.

---

## 개선 제안

### 1. Error Boundary 미적용

- **파일**: `src/routes/__root.tsx`
- **카테고리**: 에러 처리
- **현재**: 앱 전체에 Error Boundary가 없어 Server Function 호출 실패나 예기치 않은 런타임 에러 발생 시 React가 전체 컴포넌트 트리를 언마운트합니다. 사용자는 빈 화면을 보게 됩니다.
- **개선**: 루트 레이아웃에 React Error Boundary를 추가하고, 페이지 단위로 세분화된 에러 UI를 제공합니다.

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react"

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center gap-3 py-16 text-destructive">
          <p className="text-sm">오류가 발생했습니다. 페이지를 새로고침해 주세요.</p>
        </div>
      )
    }
    return this.props.children
  }
}

// src/routes/__root.tsx - RootDocument 내부
<TooltipProvider delayDuration={300}>
  <ProjectProvider>
    <ErrorBoundary>
      <Layout>{children}</Layout>
    </ErrorBoundary>
  </ProjectProvider>
</TooltipProvider>
```

- **근거**: React 공식 문서의 [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) 권장 사항. 프로덕션 앱에서 예기치 않은 에러로 인한 빈 화면은 최악의 UX입니다.

---

### 2. ~~`ClaudeMdEditor`의 로컬 state 기반 비동기 처리~~ (해결됨)

- **상태**: **해결됨** (PR #2 `fix/claude-md-editor-tanstack-query`)
- **파일**: `src/routes/claude-md.tsx`, `src/hooks/use-config.ts`
- **카테고리**: 데이터 페칭, 구조
- **적용된 개선**:
  - 6개의 로컬 state + `useEffect` 수동 비동기 처리를 `useClaudeMdFile` 커스텀 훅(`useQuery` + `useMutation`)으로 통합
  - `...REFETCH_OPTIONS` 적용으로 일관된 polling 동작
  - `useRef`로 초기화 가드를 두어 polling refetch 시 편집 내용 보호
  - `savedContent` 로컬 상태로 `isDirty` 정확도 향상 및 저장 성공 시 즉시 반영
- **근거**: TanStack Query v5 공식 문서의 [Server State Management](https://tanstack.com/query/latest/docs/framework/react/guides/queries) 원칙. 서버 상태와 UI 상태를 분리하면 코드가 단순해지고, 자동 재시도/캐싱 혜택을 얻을 수 있습니다.

---

### 3. 유틸리티 함수 중복 (`formatDate`, `formatFileSize`)

- **파일**: `src/routes/plugins.tsx` (21행), `src/routes/plugins.$id.tsx` (26행), `src/routes/claude-md.tsx` (28-31행)
- **카테고리**: 구조, DRY 원칙
- **현재**: `formatDate`와 `formatFileSize` 함수가 여러 파일에 동일하게 정의되어 있습니다.

```tsx
// plugins.tsx, plugins.$id.tsx, claude-md.tsx 각각에 동일하게 존재
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
```

- **개선**: `src/lib/utils.ts`에 공통 포맷 함수로 이전합니다.

```typescript
// src/lib/utils.ts에 추가
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
```

- **근거**: DRY(Don't Repeat Yourself) 원칙. 날짜 포맷 로직이 변경될 때 한 곳만 수정하면 됩니다.

---

### 4. `AgentDetailPage`/`CommandDetailPage`/`SkillDetailPage`의 반복 패턴 추출

- **파일**: `src/routes/agents.$name.tsx`, `src/routes/commands.$name.tsx`, `src/routes/skills.$name.tsx`
- **카테고리**: 구조, 재사용성
- **현재**: 세 파일의 상세 페이지 구조(로딩 Skeleton, "not found" 상태, Details 카드, Frontmatter 카드, Content 카드)가 거의 동일합니다. 파일 내용을 표시하는 Content 카드는 세 파일 모두 실제 내용 없이 "Open file to view content: {path}" 메시지만 표시합니다.

```tsx
// 세 파일 모두 동일한 Content 카드
<pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-md p-4 max-h-96 overflow-auto">
  <span className="text-muted-foreground italic">
    Open file to view content: {agent.path}
  </span>
</pre>
```

- **개선**: 공통 `AgentDetailLayout` 컴포넌트로 추출하고, 아이콘과 타입만 props로 받습니다.

```tsx
// src/components/AgentDetailLayout.tsx
interface AgentDetailLayoutProps {
  item: AgentFile
  icon: React.ElementType
  backTo: string
  backLabel: string
}

export function AgentDetailLayout({ item, icon: Icon, backTo, backLabel }: AgentDetailLayoutProps) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={backTo}><ArrowLeft className="w-4 h-4 mr-1" />{backLabel}</Link>
      </Button>
      {/* 공통 Details / Frontmatter / Content 카드 */}
    </div>
  )
}
```

- **근거**: React 공식 문서의 [컴포넌트 구성](https://react.dev/learn/thinking-in-react) 원칙. 중복 제거로 유지보수 비용을 줄입니다.

---

### 5. `AddMcpDialog`의 폼 상태 관리 복잡성

- **파일**: `src/routes/mcp.tsx` (36-198행)
- **카테고리**: 폼 처리, 구조
- **현재**: 6개의 독립적인 `useState`로 폼 필드를 관리합니다. 타입 변경 시 조건부 필드 표시가 있어 상태가 복잡해집니다.

```tsx
// 현재: 6개의 분리된 state
const [name, setName] = useState("")
const [command, setCommand] = useState("")
const [args, setArgs] = useState("")
const [url, setUrl] = useState("")
const [scope, setScope] = useState<Scope>("global")
const [type, setType] = useState<"stdio" | "sse" | "streamable-http">("stdio")
const [error, setError] = useState("")
```

- **개선**: 폼 상태를 단일 객체로 묶거나, 다이얼로그 닫힐 때 초기화 로직을 `onOpenChange`에서 처리합니다. 현재 닫힘 시 state 초기화가 `onSuccess` 콜백에만 있어 에러 후 닫기 시 이전 입력값이 남을 수 있습니다.

```tsx
// 개선: 단일 상태 객체 + 다이얼로그 닫힐 때 초기화
const [form, setForm] = useState(initialFormState)

const handleOpenChange = (open: boolean) => {
  setOpen(open)
  if (!open) setForm(initialFormState) // 닫힐 때 항상 초기화
}
```

- **근거**: React 폼 상태 관리 모범 사례. 관련 상태를 그룹화하면 초기화 로직의 일관성이 높아집니다.

---

### 6. `ScopeBadge`의 타입 불일치

- **파일**: `src/components/ScopeBadge.tsx`, `src/shared/types.ts`
- **카테고리**: TypeScript
- **현재**: `ScopeBadgeProps`의 `scope`는 `"global" | "project" | "user"`를 받지만, `Scope` 타입은 `"global" | "project"`만 정의되어 있습니다. Plugin의 scope는 별도로 `"user" | "project"`를 사용해 타입이 분산되어 있습니다.

```typescript
// types.ts
export type Scope = "global" | "project"  // user가 없음

// Plugin 타입
scope: "user" | "project"  // 별도 정의

// ScopeBadge.tsx
scope: "global" | "project" | "user"  // inline으로 확장
```

- **개선**: 타입을 통합하거나 명시적으로 분리합니다.

```typescript
// types.ts
export type ConfigScope = "global" | "project"
export type PluginScope = "user" | "project"
export type AnyScope = ConfigScope | PluginScope  // = "global" | "project" | "user"

// ScopeBadge.tsx
scope: AnyScope
```

- **근거**: TypeScript strict 모드 원칙. 타입이 여러 곳에 분산되면 scope 값 추가 시 누락이 발생할 수 있습니다.

---

### 7. `inputValidator`의 패스스루 패턴 — Zod 도입 고려

- **파일**: `src/server/claude-md.ts`, `src/server/items.ts`, `src/server/mcp.ts` 등
- **카테고리**: 타입, 보안
- **현재**: `inputValidator`가 입력을 그대로 반환하는 identity 함수로만 사용됩니다. 실질적인 런타임 유효성 검사가 없습니다.

```typescript
// 현재: 런타임 검증 없는 패스스루
.inputValidator((data: { scope: Scope; content: string; projectPath?: string }) => data)
```

- **개선**: 간단한 Zod 스키마를 도입해 런타임 타입 안전성을 확보합니다. TanStack Start는 Zod validator를 공식 지원합니다.

```typescript
import { z } from "zod"

const saveClaudeMdSchema = z.object({
  scope: z.enum(["global", "project"]),
  content: z.string(),
  projectPath: z.string().optional(),
})

export const saveClaudeMdFn = createServerFn({ method: "POST" })
  .inputValidator(saveClaudeMdSchema)
  .handler(async ({ data }) => { /* data가 자동으로 타입 추론됨 */ })
```

- **근거**: TanStack Start 공식 문서의 [Input Validation](https://tanstack.com/start/latest/docs/framework/react/server-functions#input-validation) 섹션 권장 사항. 클라이언트 타입 강제만으로는 서버에서 악의적인 입력을 막을 수 없습니다.

---

### 8. 접근성: `LanguageSwitcher`의 활성 상태 표시

- **파일**: `src/components/LanguageSwitcher.tsx`
- **카테고리**: 접근성
- **현재**: 현재 선택된 언어를 시각적으로만(배경색) 구분하며, `aria-pressed`나 `aria-current` 속성이 없어 스크린리더 사용자가 현재 선택 상태를 알 수 없습니다.

```tsx
// 현재: 시각적 구분만 있음
<button
  type="button"
  onClick={() => setLocale(locale)}
  className={`... ${locale === getLocale() ? "bg-primary ..." : "bg-muted ..."}`}
>
```

- **개선**: `aria-pressed` 속성을 추가합니다.

```tsx
<button
  key={locale}
  type="button"
  onClick={() => setLocale(locale)}
  aria-pressed={locale === getLocale()}
  className={...}
>
  {localeLabels[locale]()}
</button>
```

- **근거**: WCAG 2.1 SC 4.1.2 (Name, Role, Value). 토글 버튼은 `aria-pressed`로 상태를 명시해야 합니다.

---

### 9. 접근성: `CollapsibleTrigger`에 `aria-label` 없음

- **파일**: `src/routes/claude-md.tsx` (246-260행)
- **카테고리**: 접근성
- **현재**: Collapsible 트리거 버튼에 텍스트가 있지만, 접기/펼치기 상태가 스크린리더에 전달되지 않습니다.

```tsx
// 현재
<CollapsibleTrigger className="flex items-center gap-2 w-full p-2 ...">
  <ChevronRight className="size-4 transition-transform" />
  <Globe className="size-4" />
  <span>Global</span>
</CollapsibleTrigger>
```

- **개선**: `ChevronRight` 아이콘에 `aria-hidden`을 추가하고, Radix Collapsible이 이미 `aria-expanded`를 관리하므로 아이콘에 `aria-hidden="true"`만 추가하면 됩니다.

```tsx
<CollapsibleTrigger ...>
  <ChevronRight className="size-4 transition-transform" aria-hidden="true" />
  <Globe className="size-4" aria-hidden="true" />
  <span>Global</span>
</CollapsibleTrigger>
```

- **근거**: WCAG 2.1 SC 1.1.1. 장식적 아이콘에 `aria-hidden`을 추가하면 스크린리더가 중복 읽기를 방지합니다.

---

### 10. `useCliStatus` 폴링이 필요 이상으로 빈번

- **파일**: `src/hooks/use-config.ts` (189-198행)
- **카테고리**: 성능
- **현재**: CLI 상태(`getCliStatusFn`)가 다른 데이터와 동일하게 5초마다 폴링됩니다. CLI 설치 여부는 앱 실행 중 변경될 가능성이 매우 낮습니다.

```typescript
export function useCliStatus() {
  return useQuery({
    queryKey: ["cli-status"],
    queryFn: ...,
    ...REFETCH_OPTIONS, // refetchInterval: 5000 — 불필요한 폴링
  })
}
```

- **개선**: CLI 상태는 `staleTime`을 길게 설정하고 폴링 주기를 줄입니다.

```typescript
export function useCliStatus() {
  return useQuery({
    queryKey: ["cli-status"],
    queryFn: async () => {
      const { getCliStatusFn } = await import("@/server/cli-status")
      return getCliStatusFn()
    },
    staleTime: 60_000,        // 1분간 신선한 것으로 간주
    refetchOnWindowFocus: true, // 윈도우 포커스 시만 재조회
    // refetchInterval 제거
  })
}
```

- **근거**: TanStack Query v5 공식 문서의 [Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) 원칙. 변경 빈도에 맞는 캐시 전략을 사용해야 불필요한 서버 요청을 줄일 수 있습니다.

---

## 우선순위

### 높음 (즉시 적용 권장)

| # | 제목 | 이유 |
|---|------|------|
| ~~1~~ | ~~Error Boundary 추가~~ (완료) | 런타임 에러 시 전체 화면 블랭크 방지 — PR #4에서 완료 |
| ~~7~~ | ~~inputValidator Zod 도입~~ (완료) | Zod 스키마로 모든 서버 함수 런타임 검증 추가 완료 |

### 중간 (다음 스프린트 권장)

| # | 제목 | 이유 |
|---|------|------|
| ~~2~~ | ~~ClaudeMdEditor TanStack Query 전환~~ (완료) | ~~해결됨 — PR #2에서 통합 완료~~ |
| ~~3~~ | ~~유틸리티 함수 중복 제거~~ (완료) | DRY 원칙 — src/lib/format.ts로 통합 완료 |
| ~~5~~ | ~~AddMcpDialog 폼 상태 통합~~ (완료) | 단일 form 객체 + onOpenChange 리셋 — 통합 Files 뷰 PR에서 완료 |
| 6 | ScopeBadge 타입 정리 | TypeScript strict 일관성 |
| ~~10~~ | ~~useCliStatus 폴링 최적화~~ (완료) | staleTime 60s + 폴링 제거 완료 |

### 낮음 (여유 있을 때 개선)

| # | 제목 | 이유 |
|---|------|------|
| ~~4~~ | ~~Detail 페이지 공통 컴포넌트 추출~~ (완료) | PR #3에서 AgentFileDetail.tsx로 추출 완료 |
| ~~8~~ | ~~LanguageSwitcher aria-pressed~~ (완료) | `aria-pressed` 속성 추가 — 통합 Files 뷰 PR에서 완료 |
| 9 | CollapsibleTrigger 아이콘 aria-hidden | 접근성 개선, Radix가 이미 상당 부분 처리 |

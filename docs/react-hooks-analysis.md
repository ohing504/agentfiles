# React Hook 개선 분석 보고서

## 요약

전체 코드베이스를 분석한 결과, 전반적으로 TanStack Query 기반의 커스텀 훅 구조가 잘 설계되어 있습니다. `ClaudeMdEditor`의 `useEffect` + `useState` 혼합 패턴은 PR #2에서 TanStack Query로 통합 완료되었습니다. 남은 개선 기회로는 `ProjectContext.tsx`에서 매 렌더링마다 새로운 함수 참조가 생성되고 있으며, agents/commands/skills 상세 페이지에 동일한 파라미터 파싱 로직이 중복되어 있습니다. 폴링 주기(5초)가 모든 쿼리에 일괄 적용되어 실제 변경이 잦지 않은 데이터에 불필요한 요청이 발생하고 있습니다. PluginsPage에서 파생 상태를 `useMemo` 없이 매 렌더링마다 재계산하는 부분도 개선할 수 있습니다.

---

## 현재 Hook 사용 현황

| 파일 | 사용 Hook | 비고 |
|------|-----------|------|
| `src/hooks/use-config.ts` | `useQuery`, `useMutation`, `useQueryClient` | 메인 데이터 훅 (overview, claude-md, plugins, mcp, agent-files, cli-status) |
| `src/hooks/use-projects.ts` | `useQuery`, `useMutation`, `useQueryClient` | 프로젝트 CRUD |
| `src/hooks/use-claude-md-files.ts` | `useQuery` | 프로젝트 내 CLAUDE.md 파일 목록 |
| `src/hooks/use-mobile.ts` | `useState`, `useEffect` | 모바일 브레이크포인트 감지 |
| `src/components/ProjectContext.tsx` | `createContext`, `useContext` | 프로젝트 컨텍스트 |
| `src/routes/claude-md.tsx` | `useState`, `useEffect`, `useRef` | 에디터 로컬 상태 (`useClaudeMdFile` 훅 사용) |
| `src/routes/mcp.tsx` | `useState` | 다이얼로그 폼 상태 |
| `src/components/AddProjectDialog.tsx` | `useState` (커스텀 훅 `useBrowseDir`) | 디렉토리 브라우저 상태 |

---

## 개선 제안

### 1. ~~`ClaudeMdEditor` — `useEffect` + `useState` 패턴을 TanStack Query로 통합~~ (해결됨)

- **상태**: **해결됨** (PR #2 `fix/claude-md-editor-tanstack-query`)
- **파일**: `src/routes/claude-md.tsx`, `src/hooks/use-config.ts`
- **적용된 개선**:
  - 6개의 `useState` + `useEffect` 수동 비동기 처리를 `useClaudeMdFile` 커스텀 훅(TanStack Query `useQuery` + `useMutation`)으로 통합
  - `...REFETCH_OPTIONS` 적용으로 다른 훅과 일관된 polling 동작 유지
  - `useRef`로 초기화 여부를 추적하여 polling refetch 시 편집 내용 보호
  - `savedContent` 로컬 상태로 정확한 `isDirty` 계산 및 저장 성공 시 즉시 업데이트
  - `key={editorKey}`를 통한 컴포넌트 리마운트 방식은 유지 (파일 전환 시 상태 초기화)

---

### 2. `ProjectContext.tsx` — `value` 객체에 `useMemo` 적용

- **파일**: `src/components/ProjectContext.tsx` (26~36번째 줄)
- **현재 패턴**:
  ```tsx
  // 매 렌더링마다 새로운 객체와 함수 참조가 생성됨
  const value: ProjectContextValue = {
    projects,
    activeProject,
    activeProjectPath,
    isLoading: query.isLoading,
    setActiveProject: (path) => setActiveMutation.mutate(path),
    addProject: async (path) => { await addMutation.mutateAsync(path) },
    removeProject: (path) => removeMutation.mutate(path),
  }
  ```
- **개선 방안**:
  ```tsx
  const setActiveProject = useCallback(
    (path: string | null) => setActiveMutation.mutate(path),
    [setActiveMutation]
  )
  const addProject = useCallback(
    async (path: string) => { await addMutation.mutateAsync(path) },
    [addMutation]
  )
  const removeProject = useCallback(
    (path: string) => removeMutation.mutate(path),
    [removeMutation]
  )

  const value = useMemo(() => ({
    projects,
    activeProject,
    activeProjectPath,
    isLoading: query.isLoading,
    setActiveProject,
    addProject,
    removeProject,
  }), [projects, activeProject, activeProjectPath, query.isLoading,
      setActiveProject, addProject, removeProject])
  ```
- **이유**: `Context.Provider`의 `value`가 매 렌더링마다 새 객체를 생성하면, 해당 컨텍스트를 구독하는 모든 하위 컴포넌트(`ProjectSwitcher`, `AddProjectDialog`, `useClaudeMd` 등)가 불필요하게 리렌더링됩니다. `useMemo`로 안정적인 참조를 유지하면 성능이 개선됩니다.

---

### 3. agents/commands/skills 상세 페이지 — 파라미터 파싱 로직 커스텀 훅 추출

- **파일**:
  - `src/routes/agents.$name.tsx` (16~19번째 줄)
  - `src/routes/commands.$name.tsx` (15~18번째 줄)
  - `src/routes/skills.$name.tsx` (16~19번째 줄)
- **현재 패턴**: 3개 파일에 동일한 코드가 중복
  ```tsx
  // agents.$name.tsx, commands.$name.tsx, skills.$name.tsx 모두 동일
  const { name: encodedName } = Route.useParams()
  const decoded = decodeURIComponent(encodedName)
  const [scope, ...nameParts] = decoded.split(":")
  const agentName = nameParts.join(":")
  ```
- **개선 방안**: `src/hooks/` 에 커스텀 훅 추출
  ```tsx
  // src/hooks/use-agent-file-param.ts
  export function useAgentFileParam(encodedName: string) {
    return useMemo(() => {
      const decoded = decodeURIComponent(encodedName)
      const [scope, ...nameParts] = decoded.split(":")
      return { scope, name: nameParts.join(":"), decoded }
    }, [encodedName])
  }

  // 사용: agents.$name.tsx, commands.$name.tsx, skills.$name.tsx
  const { name: encodedName } = Route.useParams()
  const { scope, name: agentName } = useAgentFileParam(encodedName)
  ```
- **이유**: 동일한 파싱 로직이 3곳에 중복되어 있어 유지보수성이 낮습니다. 커스텀 훅으로 추출하면 단일 책임 원칙을 지키고, 향후 파라미터 형식이 변경될 때 한 곳만 수정하면 됩니다. `useMemo`로 감싸면 `encodedName`이 바뀌지 않는 한 재계산도 방지됩니다.

---

### 4. `PluginsPage` — 파생 상태에 `useMemo` 적용

- **파일**: `src/routes/plugins.tsx` (120~128번째 줄)
- **현재 패턴**:
  ```tsx
  function PluginsPage() {
    const { query } = usePlugins()
    const { data: cliStatus } = useCliStatus()
    const plugins = query.data ?? []
    const cliAvailable = cliStatus?.available ?? false

    // 매 렌더링마다 filter() 호출
    const userPlugins = plugins.filter((p) => p.scope === "user")
    const projectPlugins = plugins.filter((p) => p.scope === "project")
  ```
- **개선 방안**:
  ```tsx
  const plugins = query.data ?? []
  const { userPlugins, projectPlugins } = useMemo(() => ({
    userPlugins: plugins.filter((p) => p.scope === "user"),
    projectPlugins: plugins.filter((p) => p.scope === "project"),
  }), [plugins])
  ```
- **이유**: 현재 구현은 렌더링마다 `filter()`를 두 번 호출합니다. 플러그인 목록이 바뀌지 않을 때(예: 5초 폴링 중 결과가 같을 때)도 재계산됩니다. `useMemo`로 `plugins` 참조가 변경될 때만 재계산하도록 최적화할 수 있습니다. `McpPage`의 `globalServers`, `projectServers` 분류도 동일하게 적용할 수 있습니다(`src/routes/mcp.tsx` 303~304번째 줄).

---

### 5. `useConfig.ts` — REFETCH_OPTIONS 폴링 전략 세분화

- **파일**: `src/hooks/use-config.ts` (5~8번째 줄)
- **현재 패턴**:
  ```tsx
  // 모든 쿼리에 동일한 5초 폴링 적용
  const REFETCH_OPTIONS = {
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  } as const
  ```
- **개선 방안**:
  ```tsx
  // 변경 빈도에 따라 폴링 주기 분리
  const FREQUENT_REFETCH = {
    refetchOnWindowFocus: true,
    refetchInterval: 5000,  // overview, claude-md 등 빠른 변화 감지 필요
  } as const

  const INFREQUENT_REFETCH = {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,  // cli-status는 자주 변하지 않음
  } as const
  ```
- **이유**: `useCliStatus()`는 Claude CLI 설치 여부를 확인하는데, 이는 5초마다 확인할 필요가 없습니다. `usePlugins()`, `useMcpServers()`도 실시간 파일 변경이 없다면 더 긴 간격이 적절합니다. 불필요한 서버 함수 호출을 줄여 성능을 개선할 수 있습니다.

---

### 6. `AddMcpDialog` — 폼 상태 리셋에 `useCallback` 적용

- **파일**: `src/routes/mcp.tsx` (36~198번째 줄)
- **현재 패턴**:
  ```tsx
  // 6개의 독립적 useState (name, command, args, url, scope, type, error)
  const [name, setName] = useState("")
  const [command, setCommand] = useState("")
  const [args, setArgs] = useState("")
  const [url, setUrl] = useState("")
  const [scope, setScope] = useState<Scope>("global")
  const [type, setType] = useState<"stdio" | "sse" | "streamable-http">("stdio")
  const [error, setError] = useState("")
  ```
- **개선 방안**: 폼 상태를 단일 객체로 통합하고, 리셋 함수를 `useCallback`으로 메모이제이션
  ```tsx
  const INITIAL_FORM = { name: "", command: "", args: "", url: "",
                         scope: "global" as Scope, type: "stdio" as const, error: "" }
  const [form, setForm] = useState(INITIAL_FORM)

  const resetForm = useCallback(() => setForm(INITIAL_FORM), [])
  const handleFieldChange = useCallback(
    (field: keyof typeof INITIAL_FORM) => (value: string) =>
      setForm(prev => ({ ...prev, [field]: value, error: "" })),
    []
  )
  ```
- **이유**: 현재 성공 시 6개의 `setState` 호출이 연속으로 발생합니다. 단일 객체로 통합하면 리셋이 한 번의 상태 업데이트로 처리됩니다. 오버엔지니어링을 피하면서도 유지보수성이 향상됩니다.

---

### 7. `useClaudeMdFiles` — staleTime 설정 누락

- **파일**: `src/hooks/use-claude-md-files.ts` (7~15번째 줄)
- **현재 패턴**:
  ```tsx
  return useQuery({
    queryKey: ["claude-md-files", activeProjectPath],
    queryFn: async () => { ... },
    enabled: !!activeProjectPath,
    // staleTime, refetchInterval 없음
  })
  ```
- **개선 방안**:
  ```tsx
  return useQuery({
    queryKey: ["claude-md-files", activeProjectPath],
    queryFn: async () => { ... },
    enabled: !!activeProjectPath,
    staleTime: 10_000,        // 10초 이내 재요청 방지
    refetchOnWindowFocus: true,
  })
  ```
- **이유**: `use-config.ts`의 다른 훅들은 `REFETCH_OPTIONS`를 적용하지만 `useClaudeMdFiles`는 아무 옵션도 없습니다. 프로젝트 전환 시 불필요한 요청이 반복될 수 있습니다. 일관된 refetch 전략을 적용하는 것이 좋습니다.

---

## 우선순위

### 높음

| 번호 | 제목 | 이유 |
|------|------|------|
| ~~1~~ | ~~`ClaudeMdEditor` 패턴 통합~~ | ~~해결됨 — PR #2에서 TanStack Query로 통합 완료~~ |
| 3 | 파라미터 파싱 훅 추출 | 3파일 완전 중복 — DRY 원칙 위반 |

### 중간

| 번호 | 제목 | 이유 |
|------|------|------|
| 2 | `ProjectContext` `useMemo` | 컨텍스트 불필요 리렌더링 방지 — 앱 전체 영향 |
| 5 | 폴링 전략 세분화 | 불필요한 서버 호출 감소 |

### 낮음

| 번호 | 제목 | 이유 |
|------|------|------|
| 4 | `PluginsPage` `useMemo` | 현재 플러그인 수가 적어 성능 영향 미미 |
| 6 | `AddMcpDialog` 폼 상태 통합 | 기능적 문제 없음, 코드 정리 수준 |
| 7 | `useClaudeMdFiles` staleTime | 기능적 문제 없음, 일관성 향상 |

---

## 참고: 현재 잘 구현된 패턴

- **`useBrowseDir`** (`AddProjectDialog.tsx`): 로컬 비동기 상태를 컴포넌트 내부 커스텀 훅으로 적절히 분리
- **`useIsMobile`** (`use-mobile.ts`): `useEffect` 클린업(`removeEventListener`)이 올바르게 구현됨
- **쿼리 키 설계**: `["agent-files", type, activeProjectPath]` 형태로 계층적으로 잘 설계됨
- **낙관적 업데이트 없이 단순 invalidation**: 현재 앱 규모에서는 `onSuccess` → `invalidateQueries` 패턴이 적절함

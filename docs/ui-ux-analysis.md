# UI/UX 개선 분석 보고서

## 요약

agentfiles의 UI는 shadcn/ui + Tailwind CSS v4를 기반으로 일관된 컴포넌트 시스템을 잘 활용하고 있으며, Skeleton 로딩 상태, ScopeBadge를 통한 스코프 시각화, 반응형 그리드 레이아웃 등 기본기가 탄탄합니다. 그러나 Agents/Commands/Skills 상세 페이지에서 파일 내용을 실제로 표시하지 않는 미완성 상태, 영어로만 작성된 하드코딩 문자열 혼용, 빈 상태 메시지의 단순함, 저장 성공/실패 피드백 부재 등이 주요 개선 포인트입니다. 개발자 도구 특성에 맞게 실용적이고 점진적인 개선을 우선합니다.

---

## 현재 디자인 평가

### 잘 된 부분

1. **일관된 컴포넌트 사용**: 모든 페이지에서 `Card`, `Badge`, `Button`, `Skeleton` 등 shadcn/ui 컴포넌트를 일관되게 사용하고 있어 시각적 통일성이 높습니다.

2. **스코프 시각화**: `ScopeBadge` 컴포넌트가 `global`(파란색), `project`(초록색), `user`(보라색)로 색상을 구분하여 스코프를 직관적으로 표현합니다. 다크 모드도 지원합니다.

3. **로딩 상태 처리**: 모든 페이지에서 `Skeleton` 컴포넌트로 로딩 상태를 표시하며, 실제 콘텐츠 레이아웃과 유사한 형태로 placeholder를 제공합니다.

4. **에러 상태 처리**: `AlertCircle` 아이콘과 함께 에러 메시지를 표시하고, 빈 상태에서는 아이콘과 설명 텍스트로 적절한 안내를 제공합니다.

5. **대화형 확인 다이얼로그**: MCP 서버 삭제 시 `AlertDialog`로 되돌릴 수 없는 작업에 대한 확인을 요구합니다.

6. **섹션별 그룹핑**: Plugins, MCP 페이지에서 스코프(global/project)별로 섹션을 나누어 정보 계층이 명확합니다.

7. **프로젝트 전환**: `ProjectSwitcher`가 사이드바 헤더에 위치하여 접근성이 좋고, 현재 선택된 프로젝트를 체크 표시로 명확히 보여줍니다.

8. **디자인 토큰 활용**: `oklch` 색상 시스템과 CSS 변수로 다크 모드를 포함한 일관된 색상 체계를 유지합니다.

9. **파일 브라우저**: `AddProjectDialog`에서 폴더를 직접 탐색할 수 있는 내장 파일 브라우저를 제공하여 경로 입력 오류를 줄여줍니다.

### 개선이 필요한 부분

1. **미완성 콘텐츠 표시**: Agents, Commands, Skills 상세 페이지에서 파일 내용을 실제로 보여주지 않고 파일 경로만 안내하는 이탤릭 텍스트가 표시됩니다.

2. **영어 하드코딩 문자열**: i18n(`paraglide`)을 사용함에도 불구하고 `"Global"`, `"Project"`, `"Saving..."`, `"Unsaved changes"`, `"Back to Agents"` 등 영어 문자열이 여러 페이지에 하드코딩되어 있습니다.

3. **저장 성공 피드백 부재**: CLAUDE.md 에디터에서 저장 성공 시 toast나 시각적 피드백이 없어 사용자가 저장 완료 여부를 인지하기 어렵습니다.

4. **단순한 빈 상태 메시지**: 빈 상태에서 아이콘과 짧은 텍스트만 표시하며, 다음 행동(CTA)을 안내하지 않습니다.

5. **개발 도구 노출**: `__root.tsx`에서 `TanStackDevtools`와 `TanStackRouterDevtoolsPanel`이 프로덕션에서도 렌더링될 수 있습니다.

6. **MCP 추가 폼의 원시 select**: MCP 추가 다이얼로그에서 Type, Scope 필드가 shadcn `Select` 컴포넌트가 아닌 HTML 기본 `<select>`를 사용하여 시각적 일관성이 깨집니다.

7. **Dashboard의 하드코딩된 레이블**: 대시보드 `StatCard`에서 `Global:`, `Project:` 레이블이 i18n 없이 영어로 하드코딩되어 있습니다.

8. **Layout 헤더 영역 활용 미흡**: `Layout.tsx`에서 헤더(`h-16`)가 `SidebarTrigger`만 포함하고 있어 페이지 제목, 브레드크럼 등 유용한 정보를 표시할 공간이 낭비되고 있습니다.

---

## 개선 제안

### 1. Agents/Commands/Skills 상세 페이지 파일 내용 표시 구현

- **페이지/컴포넌트**: `src/routes/agents.$name.tsx`, `src/routes/commands.$name.tsx`, `src/routes/skills.$name.tsx`
- **현재 상태**: Content 카드에 `"Open file to view content: {path}"` 라는 이탤릭 텍스트만 표시되며 실제 파일 내용이 없습니다. 이는 기능 미완성 상태로, 사용자가 상세 페이지로 이동해도 유용한 정보를 얻지 못합니다.
- **개선**: `getItemFn` 서버 함수를 활용하여 파일 내용을 불러와 `<pre>` 태그 내에 표시합니다. 이미 `getItemFn`이 `src/server/items.ts`에 구현되어 있으므로 프론트엔드 호출만 추가하면 됩니다.

  ```tsx
  // agents.$name.tsx Content 카드 개선 예시
  const { data: itemContent, isLoading: contentLoading } = useQuery({
    queryKey: ["agent-content", agent.scope, agent.name],
    queryFn: async () => {
      const { getItemFn } = await import("@/server/items")
      return getItemFn({ data: { type: "agent", scope: agent.scope, name: agent.name } })
    },
  })

  // <pre> 내부:
  {contentLoading ? <Skeleton className="h-40 w-full" /> : itemContent?.content}
  ```

- **영향**: 사용자가 상세 페이지에서 실제 파일 내용을 확인할 수 있어, 해당 에이전트/커맨드/스킬이 무엇을 하는지 즉시 파악 가능합니다. 현재 상세 페이지로 이동하는 동기가 거의 없는 문제를 해결합니다.

---

### 2. CLAUDE.md 에디터 저장 성공 피드백 추가

- **페이지/컴포넌트**: `src/routes/claude-md.tsx` - `ClaudeMdEditor` 컴포넌트
- **현재 상태**: 저장 성공 시 `isDirty`가 `false`로 바뀌고 "Unsaved changes" 텍스트가 사라지는 것이 유일한 피드백입니다. 저장 실패 시에는 `error` 상태가 설정되지만, 성공 확인을 명확히 알 수 없습니다.
- **개선**: 저장 성공 후 짧은 시간 동안 "Saved" 상태를 표시합니다. 별도 toast 라이브러리 없이 로컬 상태만으로 구현합니다.

  ```tsx
  const [saveSuccess, setSaveSuccess] = useState(false)

  // handleSave 내 성공 처리:
  setOriginalContent(content)
  setIsDirty(false)
  setSaveSuccess(true)
  setTimeout(() => setSaveSuccess(false), 2000)

  // 버튼 영역:
  <span className="text-xs text-muted-foreground">
    {saveSuccess
      ? <span className="text-green-600">Saved</span>
      : isDirty
      ? "Unsaved changes"
      : ""}
  </span>
  ```

- **영향**: 사용자가 저장 완료 여부를 명확히 인지할 수 있어 불필요한 재저장이나 불안감을 해소합니다. 개발자 도구에서 파일 수정은 핵심 워크플로우이므로 피드백의 명확성이 중요합니다.

---

### 3. MCP 추가 다이얼로그의 select 컴포넌트 교체

- **페이지/컴포넌트**: `src/routes/mcp.tsx` - `AddMcpDialog` 컴포넌트
- **현재 상태**: Type과 Scope 선택 필드가 HTML 기본 `<select>` 태그를 사용하며, 인라인 클래스(`border-input bg-background flex h-8 w-full rounded-lg border px-3 py-1 text-sm`)로 스타일링합니다. 같은 폼의 다른 필드들은 shadcn `Input`과 `Label`을 사용하여 시각적 불일치가 발생합니다.
- **개선**: `src/components/ui/select.tsx`가 이미 존재하므로, 기본 `<select>`를 shadcn `Select` 컴포넌트로 교체합니다.

  ```tsx
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

  // Type 필드:
  <Select value={type} onValueChange={(v) => setType(v as "stdio" | "sse" | "streamable-http")}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="stdio">stdio</SelectItem>
      <SelectItem value="sse">SSE</SelectItem>
      <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
    </SelectContent>
  </Select>
  ```

- **영향**: 폼 내 모든 입력 요소가 동일한 디자인 시스템을 사용하게 되어 시각적 일관성이 향상됩니다. 다크 모드에서도 자동으로 올바른 색상이 적용됩니다.

---

### 4. 빈 상태에 행동 유도(CTA) 추가

- **페이지/컴포넌트**: `src/routes/agents.tsx`, `src/routes/commands.tsx`, `src/routes/skills.tsx`, `src/routes/mcp.tsx`
- **현재 상태**: 빈 상태에서 아이콘과 "No agents found" 같은 짧은 메시지만 표시합니다. MCP 페이지는 "Add a server to get started"라는 안내가 있지만, Agents/Commands/Skills는 다음 단계를 전혀 안내하지 않습니다.
- **개선**: 각 빈 상태에 파일 시스템 경로 안내 또는 생성 방법을 추가합니다.

  ```tsx
  // agents.tsx 빈 상태 개선 예시
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <Bot className="w-10 h-10 mb-3 opacity-40" />
    <p className="text-sm font-medium">No agents found</p>
    <p className="text-xs mt-1 text-center max-w-xs">
      Create <code className="bg-muted px-1 rounded">.md</code> files in{" "}
      <code className="bg-muted px-1 rounded">~/.claude/agents/</code> or{" "}
      <code className="bg-muted px-1 rounded">.claude/agents/</code>
    </p>
  </div>
  ```

- **영향**: 처음 사용하는 사용자가 agentfiles를 어떻게 활용하는지 즉시 이해할 수 있습니다. 개발자 도구 특성상 파일 시스템 경로 안내가 가장 직접적인 도움이 됩니다.

---

### 5. 개발 도구 프로덕션 빌드 제외

- **페이지/컴포넌트**: `src/routes/__root.tsx`
- **현재 상태**: `TanStackDevtools`와 `TanStackRouterDevtoolsPanel`이 환경 조건 없이 항상 렌더링됩니다. 프로덕션(`npx agentfiles`) 실행 시에도 개발 도구 패널이 노출됩니다.
- **개선**: 환경 변수로 조건부 렌더링을 적용합니다.

  ```tsx
  {import.meta.env.DEV && (
    <TanStackDevtools
      config={{ position: "bottom-right" }}
      plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
    />
  )}
  ```

- **영향**: 프로덕션 빌드의 번들 크기가 줄어들고, 일반 사용자에게 개발 도구가 노출되는 것을 방지합니다. 화면 우하단의 개발 도구 버튼이 사라져 UI가 더 깔끔해집니다.

---

### 6. Layout 헤더에 페이지 컨텍스트 정보 표시

- **페이지/컴포넌트**: `src/components/Layout.tsx`
- **현재 상태**: 헤더(`h-16`)에 `SidebarTrigger`만 있어 상단 16px 높이의 공간이 거의 낭비됩니다. 페이지 제목은 각 페이지 컴포넌트 내부에서 `<h1>`로 렌더링됩니다.
- **개선**: 헤더에 현재 활성 프로젝트명과 경로를 표시하여 사용자가 어떤 컨텍스트에서 작업 중인지 항상 인지할 수 있도록 합니다.

  ```tsx
  // Layout.tsx 개선 예시
  import { useProjectContext } from "@/components/ProjectContext"

  export function Layout({ children }: { children: React.ReactNode }) {
    const { activeProject } = useProjectContext()

    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
            <SidebarTrigger className="-ml-1" />
            {activeProject && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="font-mono truncate max-w-[200px]">{activeProject.name}</span>
              </div>
            )}
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    )
  }
  ```

- **영향**: 사용자가 어떤 프로젝트를 편집 중인지 항상 헤더에서 확인할 수 있어 멀티 프로젝트 환경에서 실수를 줄입니다.

---

### 7. Dashboard StatCard의 i18n 적용 및 레이블 개선

- **페이지/컴포넌트**: `src/routes/index.tsx` - `StatCard` 컴포넌트
- **현재 상태**: `Global: {count}`, `Project: {count}` 레이블이 영어로 하드코딩되어 있습니다. 또한 Plugins StatCard에서 `globalCount`로 `overview?.plugins?.user`를 전달하는데, 프로퍼티명과 의미가 불일치합니다(`user` vs `global`).
- **개선**: i18n 메시지 함수를 사용하고, 레이블 명칭을 실제 스코프와 일치시킵니다.

  ```tsx
  // StatCard의 count 표시 부분
  <div className="flex gap-2 text-xs text-muted-foreground">
    <span>{m.scope_global()}: {globalCount}</span>
    <span>{m.scope_project()}: {projectCount}</span>
  </div>
  ```

- **영향**: 언어 전환 시 대시보드 전체가 선택한 언어로 표시되는 일관성을 확보합니다.

---

### 8. Plugin 카드의 토글 버튼과 카드 링크 클릭 영역 분리 명확화

- **페이지/컴포넌트**: `src/routes/plugins.tsx` - `PluginCard` 컴포넌트
- **현재 상태**: 카드 전체가 상세 페이지로 이동하는 `Link`로 감싸져 있고, 그 안에 Enable/Disable 버튼이 있습니다. 버튼 클릭 시 `e.preventDefault()`로 이벤트 전파를 막지만, 카드와 버튼의 클릭 영역이 시각적으로 명확히 구분되지 않아 사용자가 의도하지 않게 페이지 이동할 수 있습니다.
- **개선**: 카드를 링크로 감싸지 않고, 카드 제목 부분만 링크로 처리하거나, 카드 우상단에 별도의 "상세 보기" 버튼(`ExternalLink` 아이콘)을 배치합니다.

  ```tsx
  // 제목만 링크로 처리
  <Card className="h-full">
    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
      <Link to="/plugins/$id" params={{ id: encodeURIComponent(plugin.id) }}
        className="flex items-center gap-2 min-w-0 hover:underline">
        <Puzzle className="w-4 h-4 text-muted-foreground shrink-0" />
        <CardTitle className="text-sm font-medium truncate">{plugin.name}</CardTitle>
      </Link>
      <ScopeBadge scope={plugin.scope} />
    </CardHeader>
    ...
  </Card>
  ```

- **영향**: 클릭 의도가 명확해져 실수로 페이지 이동하는 일이 줄어듭니다. 특히 Enable/Disable 토글이 주요 작업인 Plugins 페이지에서 워크플로우가 개선됩니다.

---

### 9. CLAUDE.md 에디터의 파일 경로 표시 중복 제거

- **페이지/컴포넌트**: `src/routes/claude-md.tsx` - `ClaudeMdPage` 컴포넌트
- **현재 상태**: 에디터 위에 `<span className="font-mono text-xs text-muted-foreground">` 로 파일 경로를 표시하고, 에디터(`ClaudeMdEditor`) 내부에서도 `fileMeta.path`를 다시 표시합니다. 동일한 정보가 두 번 표시됩니다.
- **개선**: 에디터 컴포넌트 내부의 경로 표시와 외부의 경로 표시 중 하나를 제거하거나, 외부에서는 선택된 파일명만 표시하고 내부에서 전체 경로를 표시하도록 역할을 분리합니다.
- **영향**: 정보 중복이 줄어 UI가 더 간결해지고, 파일 메타 정보가 에디터 헤더로 자연스럽게 통합됩니다.

---

### 10. LanguageSwitcher의 접근성 개선

- **페이지/컴포넌트**: `src/components/LanguageSwitcher.tsx`
- **현재 상태**: 언어 전환 버튼이 일반 `<button>` 태그이며, 현재 선택된 언어를 시각적으로만 구분합니다(`bg-primary text-primary-foreground`). `aria-current` 또는 `aria-label` 속성이 없습니다.
- **개선**: 접근성 속성을 추가하고, shadcn Button 컴포넌트를 활용합니다.

  ```tsx
  <Button
    key={locale}
    variant={locale === getLocale() ? "default" : "ghost"}
    size="xs"
    onClick={() => setLocale(locale)}
    aria-current={locale === getLocale() ? "true" : undefined}
    aria-label={`Switch language to ${localeLabels[locale]()}`}
  >
    {localeLabels[locale]()}
  </Button>
  ```

- **영향**: 스크린 리더 사용자가 현재 선택된 언어를 인지할 수 있고, shadcn Button을 사용하여 시각적 일관성도 향상됩니다.

---

## 우선순위

### 높음 (사용자 경험에 직접적 영향, 구현 난이도: 쉬움~보통)

| 순위 | 제안 | 영향 | 난이도 |
|------|------|------|--------|
| 1 | Agents/Commands/Skills 파일 내용 표시 구현 | 상세 페이지 핵심 기능 완성 | 보통 |
| 2 | CLAUDE.md 에디터 저장 성공 피드백 | 핵심 편집 워크플로우 개선 | 쉬움 |
| 3 | 개발 도구 프로덕션 제외 | 프로덕션 UX 및 번들 크기 | 쉬움 |
| 4 | MCP 다이얼로그 select 컴포넌트 교체 | 폼 UI 일관성 | 쉬움 |

### 중간 (UX 향상, 구현 난이도: 쉬움)

| 순위 | 제안 | 영향 | 난이도 |
|------|------|------|--------|
| 5 | 빈 상태 CTA 추가 | 신규 사용자 온보딩 | 쉬움 |
| 6 | Dashboard StatCard i18n 적용 | 다국어 일관성 | 쉬움 |
| 7 | Plugin 카드 클릭 영역 분리 | 인터랙션 명확성 | 쉬움 |
| 8 | CLAUDE.md 경로 표시 중복 제거 | UI 간결성 | 쉬움 |

### 낮음 (점진적 개선, 구현 난이도: 보통)

| 순위 | 제안 | 영향 | 난이도 |
|------|------|------|--------|
| 9 | Layout 헤더 프로젝트 컨텍스트 표시 | 멀티 프로젝트 UX | 보통 |
| 10 | LanguageSwitcher 접근성 개선 | 접근성 | 쉬움 |

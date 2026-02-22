# Unified Files View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CLAUDE.md + Agents + Commands + Skills를 하나의 "Files" 페이지로 통합하고, 분석 문서의 남은 개선사항 6개를 함께 처리한다.

**Architecture:** 현재 CLAUDE.md 에디터의 좌측 트리 + 우측 에디터 패턴을 확장. 서버 함수는 변경 없이 프론트엔드만 리팩토링. 파일 타입(CLAUDE.md vs agent/command/skill)에 따라 다른 서버 함수를 호출하지만 UI는 동일한 textarea 에디터.

**Tech Stack:** TanStack Start, React 19, TanStack Query, shadcn/ui, Tailwind CSS v4, paraglide i18n

**Design doc:** `docs/plans/2026-02-22-unified-files-view-design.md`

---

### Task 1: i18n 메시지 추가

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ko.json`

**Step 1: 영어 메시지 추가**

`messages/en.json`에 다음 키 추가:
```json
"nav_files": "Files",
"files_empty": "No files found",
"files_empty_hint": "Create .md files in ~/.claude/{type}s/ or .claude/{type}s/",
"files_select_file": "Select a file to edit"
```

**Step 2: 한국어 메시지 추가**

`messages/ko.json`에 다음 키 추가:
```json
"nav_files": "파일",
"files_empty": "파일이 없습니다",
"files_empty_hint": "~/.claude/{type}s/ 또는 .claude/{type}s/에 .md 파일을 생성하세요",
"files_select_file": "편집할 파일을 선택하세요"
```

**Step 3: paraglide 메시지 빌드**

Run: `pnpm build` (또는 dev 서버가 자동 생성)
Expected: `src/paraglide/messages/` 디렉토리에 새 메시지 함수 생성

---

### Task 2: 통합 Files 페이지 생성

**Files:**
- Create: `src/routes/files.tsx`

**핵심 구조:**
- 좌측: 트리 (Global 섹션 + Project 섹션, 각각 Collapsible)
- 우측: textarea 에디터 (현재 ClaudeMdEditor 패턴 재사용)
- 파일 선택 상태: `{ type: "claude-md", fileId: ClaudeMdFileId }` 또는 `{ type: "agent-file", agentType, name, scope }`

**Step 1: 파일 선택 타입 정의 및 기본 레이아웃 작성**

`src/routes/files.tsx` 생성. 선택 상태 타입:
```tsx
type SelectedFile =
  | { kind: "claude-md"; fileId: ClaudeMdFileId }
  | { kind: "agent-file"; agentType: AgentFile["type"]; name: string; scope: Scope }
  | null
```

레이아웃: `grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6` (현재 claude-md.tsx와 동일)

**Step 2: FileTree 컴포넌트 구현**

트리 데이터 조합:
- `useClaudeMdGlobalMeta()` → Global CLAUDE.md 노드
- `useClaudeMdFiles()` → Project CLAUDE.md 파일들
- `useAgentFiles("agent")` → agent 파일들
- `useAgentFiles("command")` → command 파일들
- `useAgentFiles("skill")` → skill 파일들

트리 구조: 두 개의 `Collapsible` 섹션 (🌐 Global / 📂 Project)
- 각 섹션 안에 CLAUDE.md 노드 + agents/, commands/, skills/ 서브 Collapsible
- 빈 디렉토리는 표시하지 않음
- 파일 아이콘: FileText (CLAUDE.md), Bot (agent), Terminal (command), Sparkles (skill)
- symlink인 skill은 `symlink` 뱃지 표시

**Step 3: FileEditor 컴포넌트 구현**

현재 `ClaudeMdEditor`의 패턴을 일반화:
- `kind === "claude-md"`: `useClaudeMdFile(fileId)` 사용 (기존과 동일)
- `kind === "agent-file"`: `getItemFn`으로 content 읽기 + `saveItemFn`으로 저장
  - `useQuery`로 content 페칭, `useMutation`으로 저장
- 공통: textarea + 메타정보(path, size, lastModified) + save 버튼 + "Saved" 피드백

`key` prop으로 파일 전환 시 컴포넌트 리마운트 (현재 CLAUDE.md 에디터와 동일 패턴)

**Step 4: 빈 상태 처리**

- 파일 미선택: 우측에 "Select a file to edit" 안내 (아이콘 + 텍스트)
- 트리가 비어있을 때: 경로 안내 CTA 표시 (`files_empty_hint` i18n 메시지)

**Step 5: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 3: 사이드바 업데이트

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: navItems 배열 변경**

```tsx
import { FolderOpen } from "lucide-react"

const navItems = [
  { to: "/", icon: LayoutDashboard, labelFn: () => m.nav_dashboard() },
  { to: "/files", icon: FolderOpen, labelFn: () => m.nav_files() },
  { to: "/plugins", icon: Puzzle, labelFn: () => m.nav_plugins() },
  { to: "/mcp", icon: Server, labelFn: () => m.nav_mcp_servers() },
] as const
```

사용하지 않는 import 제거: `Bot`, `FileText`, `Sparkles`, `Terminal`

**Step 2: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 4: Dashboard 업데이트

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: StatCard 링크와 i18n 수정**

변경사항:
1. Agents/Commands/Skills StatCard의 `to` 링크를 `/agents`, `/commands`, `/skills` → `/files`로 변경
2. ClaudeMdCard의 `to` 링크를 `/claude-md` → `/files`로 변경
3. StatCard의 하드코딩 `"Global:"`, `"Project:"` → `m.scope_global()`, `m.scope_project()`로 교체
4. ClaudeMdCard의 하드코딩 `"Global"`, `"Project"` → `m.scope_global()`, `m.scope_project()`로 교체

**Step 2: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 5: 이전 라우트 및 컴포넌트 삭제

**Files:**
- Delete: `src/routes/claude-md.tsx`
- Delete: `src/routes/agents.tsx`
- Delete: `src/routes/agents.$name.tsx`
- Delete: `src/routes/commands.tsx`
- Delete: `src/routes/commands.$name.tsx`
- Delete: `src/routes/skills.tsx`
- Delete: `src/routes/skills.$name.tsx`
- Delete: `src/components/AgentFileDetail.tsx`
- Delete: `src/lib/parse-agent-file-param.ts`

**Step 1: 파일 삭제**

위 9개 파일 삭제.

**Step 2: 사용하지 않는 import/export 정리**

- `src/hooks/use-config.ts`에서 더 이상 외부에서 사용되지 않는 훅이 있는지 확인 (useClaudeMd는 Dashboard에서 사용되지 않으므로 삭제 가능할 수 있음)
- `src/lib/query-keys.ts` 정리 불필요 (Files 페이지에서 동일 키 사용)

**Step 3: lint + typecheck 통과 확인**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

---

### Task 6: MCP 다이얼로그 개선

**Files:**
- Modify: `src/routes/mcp.tsx`

**Step 1: `<select>` → shadcn Select 교체**

Type 필드와 Scope 필드의 기본 `<select>` 태그를 `@/components/ui/select`의 `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`으로 교체.

**Step 2: 폼 상태 통합**

6개 개별 `useState` → 단일 객체 상태로 통합:
```tsx
const INITIAL_FORM = {
  name: "", command: "", args: "", url: "",
  scope: "global" as Scope,
  type: "stdio" as "stdio" | "sse" | "streamable-http",
  error: "",
}
const [form, setForm] = useState(INITIAL_FORM)
```

`onOpenChange`에 리셋 로직 추가:
```tsx
<Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(INITIAL_FORM) }}>
```

**Step 3: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 7: Plugin 카드 클릭 영역 분리

**Files:**
- Modify: `src/routes/plugins.tsx`

**Step 1: PluginCard 구조 변경**

현재: 카드 전체를 `<Link>`로 감쌈
변경: 카드에서 `<Link>` 제거, 제목 부분만 `<Link>`로 처리

```tsx
// Before: <Link to="/plugins/$id" ...><Card>...</Card></Link>
// After:
<Card className="h-full">
  <CardHeader>
    <Link to="/plugins/$id" params={...} className="hover:underline">
      <CardTitle>{plugin.name}</CardTitle>
    </Link>
    ...
  </CardHeader>
  ...
</Card>
```

Enable/Disable 버튼에서 `e.preventDefault()` 제거 (더 이상 필요 없음).

**Step 2: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 8: LanguageSwitcher 접근성

**Files:**
- Modify: `src/components/LanguageSwitcher.tsx`

**Step 1: aria-pressed 추가**

```tsx
<button
  key={locale}
  type="button"
  onClick={() => setLocale(locale)}
  aria-pressed={locale === getLocale()}
  className={...}
>
```

---

### Task 9: 품질 검증

**Step 1: 전체 품질 체크**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 모두 PASS

**Step 2: 테스트 업데이트**

기존 테스트가 삭제된 라우트를 참조하는 경우 수정. 서버 함수는 변경 없으므로 integration 테스트는 통과해야 함.

---

### Task 10: 분석 문서 업데이트

**Files:**
- Modify: `docs/react-best-practices-analysis.md`
- Modify: `docs/react-hooks-analysis.md`
- Modify: `docs/ui-ux-analysis.md`

**Step 1: 완료 상태 업데이트**

각 문서에서 이번 작업으로 해결된 항목을 (완료)로 마킹:
- BP-5: AddMcpDialog 폼 상태 통합 → 완료
- BP-8: LanguageSwitcher aria-pressed → 완료
- Hook-6: AddMcpDialog 폼 상태 통합 → 완료
- UI-1: 파일 내용 표시 → 완료
- UI-4: MCP select 교체 → 완료
- UI-5: 빈 상태 CTA → 완료
- UI-7: Dashboard StatCard i18n → 완료
- UI-8: Plugin 카드 클릭 영역 → 완료

Status 카운터 업데이트.

추가로 통합 Files 뷰로 인해 구조가 변경되었으므로, 더 이상 유효하지 않은 제안(예: detail 페이지 관련)은 해당 사항 없음으로 표기.

---

### Task 11: 커밋

**Step 1: 전체 품질 재확인**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 모두 PASS

**Step 2: 커밋 전 사용자에게 확인**

변경 내용 요약을 보여주고 커밋 메시지 제안. 사용자 승인 후 커밋.

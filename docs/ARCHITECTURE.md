# agentfiles v1 설계 문서

> AI 에이전트 설정을 관리하는 로컬 웹앱

---

## 1. 제품 개요

- **형태:** 로컬 웹앱 (`npx agentfiles` → Chrome 앱 모드로 `localhost:3000` 열기)
- **목표:** Claude Code 설정 파일을 GUI로 탐색/편집/관리
- **대상:** Claude Code를 매일 사용하는 개발자 (IDE 무관)

### 플랫폼 선택 근거

VS Code Extension 대신 로컬 웹앱을 선택한 이유:

1. Claude Code는 터미널 도구 — VS Code에 종속되면 사용자 범위가 좁아짐
2. v2(커뮤니티 레지스트리), v3(클라우드 배포)로 자연스러운 확장 가능
3. 웹 기술만으로 개발 — VS Code Extension API 학습 불필요
4. v4 멀티 에이전트(Cursor, Kiro 등) 지원 시 IDE 종속 불가

---

## 2. 아키텍처

```text
┌─────────────────────────────────────────────────────────┐
│              Browser (React SSR + CSR 하이브리드)          │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │Dashboard │ │ Explorer │ │  Detail  │                │
│  │  Page    │ │  Page    │ │  Page    │                │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│       └─────────────┴────────────┘                      │
│                         │                                │
│                    React Query                           │
│                    (데이터 fetching + 캐시)                │
└─────────────────────────┬───────────────────────────────┘
                          │ Server Functions + API Routes
┌─────────────────────────┴───────────────────────────────┐
│            TanStack Start (Vinxi/Nitro)                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                 ConfigService                    │    │
│  │                                                  │    │
│  │  ┌───────────────────┐ ┌───────────────────┐    │    │
│  │  │  scanMdDir()      │ │ parseJsonConfig() │    │    │
│  │  │  (agents,commands,│ │ (plugins, mcp,    │    │    │
│  │  │   skills,CLAUDE.md│ │  settings.json)   │    │    │
│  │  │   + frontmatter)  │ │                   │    │    │
│  │  └───────────────────┘ └───────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐                    │
│  │  FileWriter   │  │  Claude CLI    │                   │
│  │  (md 직접편집) │  │  (MCP/Plugin)  │                   │
│  └──────┬────────┘  └───────┬───────┘                    │
└─────────┴───────────────────┴──────────────────────────────┘
          │                   │
    ~/.claude/  +  .claude/   claude CLI
```

### 읽기/쓰기 하이브리드 전략

Claude Code CLI(`claude mcp`, `claude plugin` 등)는 대화형 TUI를 렌더링하여 구조화된 데이터 출력이 불가하다. 반면 쓰기 명령(`add`, `remove`, `enable`, `disable`)은 비대화형으로 동작한다. 이를 활용한 하이브리드 전략:

| 작업 | 방법 | 이유 |
|------|------|------|
| **읽기** (목록 조회, 대시보드) | 파일 직접 파싱 | CLI가 JSON 출력 미지원. 파일 직접 읽기가 빠름 |
| **마크다운 편집** (CLAUDE.md, agents, commands, skills) | 파일 직접 쓰기 | 단순 텍스트 파일이므로 직접 편집이 자연스러움 |
| **MCP 서버 추가/삭제** | `claude mcp add/remove` CLI 위임 | settings.json 직접 수정 시 Claude Code와 race condition 위험 |
| **플러그인 토글** | `claude plugin enable/disable` CLI 위임 | installed_plugins.json 포맷 변경에 안전 |

**CLI 위임의 장점:**
- Claude Code가 자체적으로 유효성 검증을 수행
- 파일 포맷 변경 시에도 CLI가 호환성을 보장
- 직접 JSON 수정으로 인한 Claude Code 설정 손상 방지

### 핵심 데이터 흐름

1. 서버 시작 → ConfigService가 `~/.claude/` + `.claude/` 스캔
2. 브라우저에서 읽기 요청 → Server Functions → ConfigService가 파일 직접 파싱
3. 브라우저에서 마크다운 편집 → Server Functions → FileWriter가 파일 직접 저장
4. 브라우저에서 MCP/Plugin 조작 → Server Functions → Claude CLI 위임 (`claude mcp add/remove`, `claude plugin enable/disable`)
5. 브라우저에서 Hooks 조작 → `useHooks()` → `getHooksFn / addHookFn / removeHookFn` → HooksService → `settings.json` hooks 섹션
6. 브라우저에서 Settings 조작 → `useSettings()` → `getSettingsFn / saveSettingsFn` → ConfigService.readSettingsJson / FileWriter.writeSettingsJson
7. React Query가 캐시 관리 (`refetchOnWindowFocus` + `refetchInterval`로 최신 상태 유지)

---

## 3. 프로젝트 구조

```text
agentfiles/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts              ← TanStack Start + Vinxi 설정
├─ biome.json                  ← Biome 린터/포매터 설정
├─ components.json             ← shadcn/ui 설정
├─ pnpm-lock.yaml
│
├─ src/
│  ├─ routes/                  ← TanStack Start 파일 기반 라우팅
│  │  ├─ __root.tsx            ← 루트 레이아웃 (사이드바 + 메인)
│  │  ├─ index.tsx             ← Dashboard (/)
│  │  ├─ hooks.tsx             ← Hooks 관리 페이지 (/hooks)
│  │  ├─ files.tsx             ← /global/files 로 redirect
│  │  ├─ plugins.tsx           ← /global/plugins 로 redirect
│  │  ├─ plugins.$id.tsx       ← /global/plugins/$id 로 redirect
│  │  ├─ mcp.tsx               ← /global/mcp 로 redirect
│  │  ├─ mcp.$name.tsx         ← /global/mcp/$name 로 redirect
│  │  ├─ global.tsx            ← Global 섹션 레이아웃 (/global)
│  │  ├─ global/
│  │  │  ├─ settings.tsx       ← Global Settings (/global/settings)
│  │  │  ├─ files.tsx          ← Global Files 뷰 (/global/files)
│  │  │  ├─ plugins.tsx        ← Global Plugins 목록 (/global/plugins)
│  │  │  ├─ plugins.$id.tsx    ← Global Plugin 상세 (/global/plugins/$id)
│  │  │  ├─ mcp.tsx            ← Global MCP 목록 (/global/mcp)
│  │  │  └─ mcp.$name.tsx      ← Global MCP 상세 (/global/mcp/$name)
│  │  ├─ project.tsx           ← Project 섹션 레이아웃 (/project)
│  │  ├─ project/
│  │  │  ├─ settings.tsx       ← Project Settings (/project/settings)
│  │  │  ├─ files.tsx          ← Project Files 뷰 (/project/files)
│  │  │  ├─ plugins.tsx        ← Project Plugins 목록 (/project/plugins)
│  │  │  ├─ plugins.$id.tsx    ← Project Plugin 상세 (/project/plugins/$id)
│  │  │  ├─ mcp.tsx            ← Project MCP 목록 (/project/mcp)
│  │  │  └─ mcp.$name.tsx      ← Project MCP 상세 (/project/mcp/$name)
│  │  └─ api/                  ← API Routes (server.handlers)
│  │     └─ health.ts          ← GET /api/health
│  │
│  ├─ services/                ← 서버 사이드 서비스
│  │  ├─ config-service.ts     ← 모든 읽기 로직 (md 스캔 + json 파싱)
│  │  ├─ file-writer.ts        ← 마크다운/JSON 파일 직접 편집
│  │  ├─ claude-cli.ts         ← MCP/Plugin CLI 위임 (child_process)
│  │  ├─ hooks-service.ts      ← settings.json hooks 섹션 CRUD
│  │  └─ project-store.ts      ← 프로젝트 목록 읽기/쓰기
│  │
│  ├─ server/                  ← Server Functions (createServerFn)
│  │  ├─ overview.ts           ← getOverview()
│  │  ├─ claude-md.ts          ← getClaudeMdFn, saveClaudeMdFn
│  │  ├─ plugins.ts            ← getPluginsFn, togglePluginFn
│  │  ├─ mcp.ts                ← getMcpServersFn, addMcpServerFn, removeMcpServerFn
│  │  ├─ items.ts              ← getItemsFn, getItemFn, saveItemFn, deleteItemFn
│  │  ├─ hooks.ts              ← getHooksFn, addHookFn, removeHookFn, readScriptFn
│  │  ├─ settings.ts           ← getSettingsFn, saveSettingsFn, getClaudeAppJsonFn, getProjectLocalSettingsFn
│  │  ├─ projects.ts           ← getProjectsFn, addProjectFn, removeProjectFn, setActiveProjectFn, browseDirFn, scanClaudeMdFilesFn
│  │  ├─ cli-status.ts         ← getCliStatusFn
│  │  ├─ config.ts             ← 경로 헬퍼, 토큰, CLI 탐색
│  │  ├─ validation.ts         ← 입력 검증 (path traversal 방지)
│  │  └─ middleware/
│  │     └─ auth.ts            ← Bearer 토큰 인증 미들웨어
│  │
│  ├─ components/              ← UI 컴포넌트
│  │  ├─ ui/                   ← shadcn 컴포넌트
│  │  │  ├─ tree.tsx           ← 파일 트리 컴포넌트
│  │  │  ├─ sonner.tsx         ← Toast 알림
│  │  │  ├─ shiki-code-block.tsx ← Shiki 기반 코드 하이라이터
│  │  │  └─ (기타 shadcn 컴포넌트...)
│  │  ├─ pages/                ← 페이지 콘텐츠 컴포넌트 (Global/Project 공통)
│  │  │  ├─ HooksPageContent.tsx    ← Hooks 관리 UI
│  │  │  ├─ FilesPageContent.tsx    ← 파일 트리 + 에디터 UI
│  │  │  ├─ PluginsPageContent.tsx  ← 플러그인 목록 UI
│  │  │  ├─ PluginDetailContent.tsx ← 플러그인 상세 UI
│  │  │  ├─ McpPageContent.tsx      ← MCP 서버 목록 UI
│  │  │  └─ McpDetailContent.tsx    ← MCP 서버 상세 UI
│  │  ├─ settings/             ← 설정 페이지 컴포넌트
│  │  │  ├─ GlobalSettingsPage.tsx  ← 글로벌 설정 UI
│  │  │  └─ ProjectSettingsPage.tsx ← 프로젝트 설정 UI
│  │  ├─ Layout.tsx            ← 고정 헤더 + 스크롤 콘텐츠 레이아웃
│  │  ├─ Sidebar.tsx           ← 네비게이션 (계층 구조 메뉴)
│  │  ├─ StatusBar.tsx         ← 하단 상태바 (CLI 버전 + 업데이트 알림)
│  │  ├─ ErrorBoundary.tsx     ← React 에러 바운더리
│  │  ├─ ScopeBadge.tsx        ← global/project 스코프 배지
│  │  ├─ ProjectContext.tsx    ← 프로젝트 컨텍스트 프로바이더
│  │  ├─ ProjectSwitcher.tsx   ← 프로젝트 전환 UI
│  │  ├─ AddProjectDialog.tsx  ← 프로젝트 추가 다이얼로그
│  │  └─ LanguageSwitcher.tsx  ← 언어 전환 (en/ko)
│  │
│  ├─ hooks/                   ← React 커스텀 훅
│  │  ├─ use-config.ts         ← TanStack Query 데이터 훅 (전체)
│  │  ├─ use-claude-md-files.ts ← CLAUDE.md 파일 목록 훅
│  │  ├─ use-projects.ts       ← 프로젝트 관리 훅
│  │  └─ use-mobile.ts         ← 모바일 감지 훅
│  │
│  ├─ lib/                     ← 유틸리티
│  │  ├─ utils.ts              ← 공통 유틸리티
│  │  ├─ auth.ts               ← 토큰 관리 (추출, 저장, 헤더)
│  │  ├─ query-keys.ts         ← TanStack Query 키 정의
│  │  └─ format.ts             ← formatFileSize, formatDate 유틸리티
│  │
│  ├─ paraglide/               ← i18n 자동 생성 (Paraglide JS)
│  │
│  └─ shared/
│     └─ types.ts
│
├─ messages/                   ← i18n 메시지 파일 (namespace별 분리)
│  ├─ en/                      ← 영어 (common, hooks, skills, plugins, mcp, config, files, settings, editor)
│  └─ ko/                      ← 한국어 (동일 구조)
│
├─ bin/
│  └─ cli.ts                   ← npx agentfiles 진입점 (Chrome 앱 모드로 열기)
│
└─ tests/
   ├─ services/                ← 서비스 단위 테스트
   ├─ server/                  ← 서버 함수 테스트
   ├─ unit/                    ← 유닛 테스트
   ├─ integration/             ← 통합 테스트
   ├─ i18n/                    ← i18n 테스트
   └─ e2e/                     ← E2E 테스트
```

---

## 4. 데이터 모델

```typescript
// ── 스코프 ──
type Scope = 'global' | 'project';

// ── CLAUDE.md ──
interface ClaudeMd {
  scope: Scope;
  path: string;
  size: number;
  lastModified: Date;
}

// ── Plugin ──
interface Plugin {
  id: string;             // "superpowers@claude-plugins-official"
  name: string;
  marketplace: string;
  scope: 'user' | 'project';
  projectPath?: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha: string;
  installPath: string;
  enabled: boolean;
}

// ── MCP Server ──
interface McpServer {
  name: string;
  scope: Scope;
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

// ── Agent / Command / Skill ──
interface AgentFile {
  name: string;
  scope: Scope;
  path: string;
  namespace?: string;
  frontmatter?: {
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  size: number;
  lastModified: Date;
  type: 'agent' | 'command' | 'skill';
  isSymlink?: boolean;
  symlinkTarget?: string;
}

// ── 대시보드 ──
interface Overview {
  claudeMd: { global?: ClaudeMd; project?: ClaudeMd };
  plugins: { total: number; user: number; project: number };
  mcpServers: { total: number; global: number; project: number };
  agents: { total: number; global: number; project: number };
  commands: { total: number; global: number; project: number };
  skills: { total: number; global: number; project: number };
  conflictCount: number;  // 글로벌 ↔ 프로젝트 동일 이름 항목 수
}

```

---

## 5. API 설계

### Server Functions + API Routes

데이터 읽기/쓰기는 Server Functions(`createServerFn`)으로 처리하고, 외부 연동용 엔드포인트만 API Routes(`createFileRoute` + `server.handlers`)로 제공한다.

**Server Functions (타입 안전한 RPC):**
```typescript
// 대시보드
getOverview()                                    ← 대시보드 전체 데이터

// CLAUDE.md
getClaudeMd({ scope })                           ← CLAUDE.md 메타 + 내용
saveClaudeMd({ scope, content })                 ← CLAUDE.md 저장

// Plugins
getPlugins()                                     ← 전체 플러그인 목록
togglePlugin({ id })                             ← enable/disable (CLI 위임)

// MCP
getMcpServers()                                  ← MCP 서버 목록
addMcpServer({ ... })                            ← MCP 추가 (CLI 위임)
removeMcpServer({ name })                        ← MCP 제거 (CLI 위임)

// Files (agents | commands | skills)
getItems({ type })                               ← 목록
getItem({ type, name })                          ← 상세 + 내용
saveItem({ type, name, content })                ← 생성/수정
deleteItem({ type, name, scope })                ← 삭제

// Hooks
getHooks({ scope })                              ← hooks 목록 조회
addHook({ scope, event, command })               ← hook 추가
removeHook({ scope, event, index })              ← hook 삭제
readScript({ path })                             ← hook 스크립트 파일 읽기

// Settings
getSettings({ scope })                           ← settings.json 조회
saveSettings({ scope, data })                    ← settings.json 저장
getClaudeAppJson()                               ← claude_desktop_config.json 조회
getProjectLocalSettings({ projectPath })         ← 프로젝트 로컬 설정 조회

// Projects
getProjects()                                    ← 프로젝트 목록
addProject({ path })                             ← 프로젝트 추가
removeProject({ path })                          ← 프로젝트 제거
setActiveProject({ path })                       ← 활성 프로젝트 변경
browseDirs({ path })                             ← 디렉토리 탐색
scanClaudeMdFiles({ projectPath })               ← CLAUDE.md 파일 목록 스캔

// CLI 상태
getCliStatus()                                   ← Claude CLI 버전 + 업데이트 여부
```

**API Routes (REST):**
```text
GET    /api/health                               ← 헬스체크
```

---

## 6. UI 화면

### 라우팅

```text
/                         → Dashboard (요약 카드 + 바로가기)
/hooks                    → Hooks 관리 (Global/Project 탭)

/global                   → Global 섹션 진입 (index redirect)
/global/settings          → Global Settings (settings.json 편집)
/global/files             → Global Files 뷰 (트리 탐색 + 에디터)
/global/plugins           → Global Plugins 목록
/global/plugins/$id       → Global Plugin 상세
/global/mcp               → Global MCP 서버 목록
/global/mcp/$name         → Global MCP 서버 상세

/project                  → Project 섹션 진입 (index redirect)
/project/settings         → Project Settings (settings.json 편집)
/project/files            → Project Files 뷰 (트리 탐색 + 에디터)
/project/plugins          → Project Plugins 목록
/project/plugins/$id      → Project Plugin 상세
/project/mcp              → Project MCP 서버 목록
/project/mcp/$name        → Project MCP 서버 상세

// 하위 호환 redirect
/files      → /global/files
/plugins    → /global/plugins
/mcp        → /global/mcp
```

### 주요 페이지

1. **Dashboard** — 전체 요약 (카운트 카드, 섹션별 바로가기)
2. **Hooks** — Global/Project 탭으로 구분된 hooks 관리. 이벤트별 커맨드 목록, 추가/삭제, Shiki로 스크립트 미리보기
3. **Settings** — Global/Project별 `settings.json` 편집 (env, permissions 등)
4. **Files** — IDE 스타일 통합 뷰. 좌측 트리(CLAUDE.md + Agents/Commands/Skills) + 우측 에디터. namespace 지원 (예: `ys/commit`)
5. **Plugins** — 카드 레이아웃으로 플러그인 목록, Enable/Disable 토글, 상세 페이지
6. **MCP Servers** — MCP 서버 목록, 타입 선택 후 추가/삭제, 상세 페이지

### 사이드바 구조

```text
Dashboard
Hooks              ← Global/Project 공통 (탭으로 전환)
── Global ──
  Settings
  Files
  Plugins
  MCP
── Project ──      (프로젝트 선택 시만 활성화)
  Settings
  Files
  Plugins
  MCP
```

- 하단: 프로젝트 전환 (ProjectSwitcher), 언어 전환 (LanguageSwitcher), StatusBar (CLI 버전 + 업데이트 알림)

### 레이아웃 패턴

- `SidebarProvider`에 `h-svh`로 뷰포트 높이 제한
- `SidebarInset`에 `overflow-hidden`으로 헤더 고정
- 콘텐츠 영역에 `overflow-y-auto`로 독립 스크롤
- macOS overscroll bounce 방지를 위해 `sticky` 대신 flex + overflow 패턴 사용

---

## 7. 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js ≥ 20 |
| 언어 | TypeScript (strict) |
| 패키지 매니저 | pnpm |
| 프레임워크 | TanStack Start (Router + Server Functions + Vinxi/Nitro) |
| 프론트엔드 | React 19 |
| 빌드/실행 | Vinxi (통합 빌드, 1개 프로세스) |
| 라우팅 | TanStack Router (파일 기반) |
| 데이터 페칭 | TanStack Query + Server Functions (`createServerFn`) |
| UI 컴포넌트 | shadcn/ui |
| 스타일링 | Tailwind CSS v4 |
| 아이콘 | Lucide React |
| 마크다운 파싱 | gray-matter |
| 코드 하이라이팅 | Shiki |
| i18n | Paraglide JS |
| 테스트 | Vitest |
| 린터 | Biome |

---

## 8. 보안

로컬 앱이지만 HTTP 서버가 열리므로 최소한의 보안 가드레일 적용:

1. **`127.0.0.1` 바인딩** — 외부 네트워크에서 접근 불가
2. **랜덤 토큰 인증** — 서버 시작 시 1회용 토큰 생성, URL 파라미터로 브라우저에 전달 (`localhost:3000?token=abc123`), 이후 모든 API 요청에 `Authorization: Bearer` 헤더 필요
3. **CORS 차단** — `Access-Control-Allow-Origin`을 설정하지 않아 다른 출처의 fetch 차단

> 이 3가지로 악성 탭에서의 CSRF/무단 접근을 방지한다.

---

## 9. 실행 흐름

### CLI (`npx agentfiles`)

1. `bin/cli.ts` 실행
2. 현재 디렉토리에서 `.claude/` 탐지 → projectPath 결정
3. Vinxi/Nitro 서버 시작 (`localhost:3000`)
4. `open` 패키지로 Chrome 앱 모드(`--app`) 열기 → 주소창 없는 앱 창
5. `Ctrl+C`로 종료

### 개발 (`pnpm dev`)

1. Vinxi dev 서버 실행 (SSR + HMR, 1개 프로세스)
2. 코드 수정 → 서버/클라이언트 자동 반영
3. Chrome 앱 모드로 열기 (주소창 없는 깔끔한 창)

---

## 10. 실제 ~/.claude/ 파일 구조 (참조)

설계 근거가 된 실제 파일 구조:

```text
~/.claude/
├─ CLAUDE.md                          ← 글로벌 설정
├─ settings.json                      ← enabledPlugins, env 등
├─ commands/
│  └─ ys/                             ← 네임스페이스 구조
│     ├─ commit.md
│     └─ review-pr.md
├─ skills/
│  └─ find-skills -> ~/.agents/skills/find-skills  ← symlink (또는 hard copy)
├─ plugins/
│  ├─ installed_plugins.json          ← 모든 플러그인 메타데이터
│  ├─ config.json
│  ├─ blocklist.json
│  └─ cache/                          ← 마켓플레이스별 캐시

~/.agents/                            ← skills.sh가 설치하는 별도 디렉토리
└─ skills/find-skills/SKILL.md
```

---

## 11. v2 확장 계획

이 설계는 다음 확장을 고려하여 만들어짐:

- **v2:** `services/config-service.ts`에 skills.sh API 클라이언트 추가, UI에 레지스트리 탭 추가
- **v3:** 서버를 클라우드 배포, 인증 레이어 추가, 같은 React 코드 재사용
- **v4:** `services/config-service.ts`에 Cursor, Kiro 등 멀티 에이전트 파싱 로직 추가

---

*이 문서는 2026-02-21 brainstorming 세션에서 작성됨*

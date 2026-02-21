# agentfiles v1 설계 문서

> AI 에이전트 설정을 관리하는 로컬 웹앱

---

## 1. 제품 개요

- **형태:** 로컬 웹앱 (`npx agentfiles` → `localhost:4321`)
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

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Dashboard │ │ Explorer │ │  Detail  │               │
│  │  Page    │ │  Page    │ │  Page    │               │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘               │
│       └─────────────┴────────────┘                     │
│                         │                                │
│                    React Query                           │
│                    (데이터 fetching + 캐시)                │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP REST API
┌─────────────────────────┴───────────────────────────────┐
│                  Local Server (Hono)                      │
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
│  ┌──────────────┐  ┌───────────────┐                      │
│  │  FileWriter   │  │  Claude CLI    │                     │
│  │  (md 직접편집) │  │  (MCP/Plugin)  │                     │
│  └──────┬────────┘  └───────┬───────┘                      │
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
2. 브라우저에서 읽기 요청 → REST API → ConfigService가 파일 직접 파싱
3. 브라우저에서 마크다운 편집 → REST API → FileWriter가 파일 직접 저장
4. 브라우저에서 MCP/Plugin 조작 → REST API → Claude CLI 위임 (`claude mcp add/remove`, `claude plugin enable/disable`)
5. React Query가 캐시 관리 (`refetchOnWindowFocus` + `refetchInterval`로 최신 상태 유지)

---

## 3. 프로젝트 구조

```
agentfiles/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ pnpm-lock.yaml
│
├─ src/
│  ├─ server/
│  │  ├─ index.ts                  ← 서버 진입점
│  │  ├─ router.ts                 ← API 라우트 정의
│  │  │
│  │  ├─ services/
│  │  │  ├─ config-service.ts      ← 모든 읽기 로직 (md 스캔 + json 파싱)
│  │  │  ├─ file-writer.ts         ← 마크다운 파일 직접 편집
│  │  │  └─ claude-cli.ts          ← MCP/Plugin CLI 위임 (child_process)
│  │  │
│  │  └─ routes/
│  │     ├─ overview.ts
│  │     ├─ plugins.ts
│  │     ├─ mcp.ts
│  │     ├─ agents.ts
│  │     ├─ commands.ts
│  │     ├─ skills.ts
│  │     └─ files.ts
│  │
│  ├─ web/
│  │  ├─ main.tsx
│  │  ├─ App.tsx
│  │  ├─ hooks/
│  │  │  └─ use-config.ts          ← TanStack Query 훅 + Hono RPC (hc)
│  │  ├─ pages/
│  │  │  ├─ Dashboard.tsx
│  │  │  ├─ Explorer.tsx
│  │  │  ├─ PluginDetail.tsx
│  │  │  ├─ McpDetail.tsx
│  │  ├─ components/
│  │  │  ├─ ui/                    ← shadcn 컴포넌트
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ FileTree.tsx
│  │  │  └─ ScopeBadge.tsx         ← 충돌 시 badge 표시 포함
│  │  └─ lib/
│  │
│  └─ shared/
│     └─ types.ts
│
├─ bin/
│  └─ cli.ts                       ← npx agentfiles 진입점
│
└─ tests/
   ├─ server/scanners/
   ├─ server/services/
   └─ e2e/
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

### REST API

```
GET    /api/overview                    ← 대시보드 전체 데이터

GET    /api/claude-md/:scope            ← CLAUDE.md 메타 + 내용
PUT    /api/claude-md/:scope            ← CLAUDE.md 저장

GET    /api/plugins                     ← 전체 플러그인 목록
PUT    /api/plugins/:id/toggle          ← enable/disable (CLI 위임)

GET    /api/mcp                         ← MCP 서버 목록
POST   /api/mcp                         ← MCP 추가 (CLI 위임)
DELETE /api/mcp/:name                   ← MCP 제거 (CLI 위임)

GET    /api/:type                       ← 목록 (agents|commands|skills)
GET    /api/:type/:name                 ← 상세 + 내용
POST   /api/:type                       ← 생성
PUT    /api/:type/:name                 ← 수정
DELETE /api/:type/:name?scope=          ← 삭제
```

---

## 6. UI 화면

### 라우팅

```
/                       → Dashboard
/claude-md?scope=global → CLAUDE.md 편집 (scope로 글로벌/프로젝트 전환)
/plugins                → Plugins 목록
/plugins/:id            → Plugin 상세
/mcp                    → MCP 목록
/mcp/:name              → MCP 상세
/agents                 → Agents 목록 (글로벌+프로젝트 통합, ScopeBadge 구분)
/agents/:name           → Agent 상세
/commands               → Commands 목록
/skills                 → Skills 목록
```

### 주요 페이지 (3개)

1. **Dashboard** — 전체 요약 (카운트 카드, 충돌 badge 표시)
2. **Plugin Detail** — 버전, 스코프, 포함된 skills, enable/disable
3. **MCP Server Detail** — command, args, env, 스코프, 상태

> 충돌(글로벌 ↔ 프로젝트 동일 이름)은 각 항목 목록에서 ScopeBadge로 표시. 전용 페이지 불필요.

### 사이드바 동작

- 존재하는 카테고리만 표시 (빈 폴더 숨김)
- 상단 [➕ New] 버튼 → Agent/Command/Skill 생성 (스코프 선택)
- Plugins와 MCP Servers는 별도 카테고리로 분리

### 항목 액션 (우클릭/버튼)

- Open / Rename / Delete
- Copy to Project (글로벌 → 프로젝트)
- Move to Global (프로젝트 → 글로벌)
- Copy Path / Reveal in Finder

---

## 7. 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js ≥ 20 |
| 언어 | TypeScript (strict) |
| 패키지 매니저 | pnpm |
| 서버 | Hono (RPC로 타입 안전한 클라이언트 제공) |
| 서버 실행 | tsx (개발), tsup (빌드) |
| 프론트엔드 | React 19 |
| 빌드 | Vite |
| 라우팅 | TanStack Router |
| 데이터 페칭 | TanStack Query |
| UI 컴포넌트 | shadcn/ui |
| 스타일링 | Tailwind CSS v4 |
| 아이콘 | Lucide React |
| 마크다운 파싱 | gray-matter |
| 테스트 | Vitest |
| 린터 | Biome |

---

## 8. 보안

로컬 앱이지만 HTTP 서버가 열리므로 최소한의 보안 가드레일 적용:

1. **`127.0.0.1` 바인딩** — 외부 네트워크에서 접근 불가
2. **랜덤 토큰 인증** — 서버 시작 시 1회용 토큰 생성, URL 파라미터로 브라우저에 전달 (`localhost:4321?token=abc123`), 이후 모든 API 요청에 `Authorization: Bearer` 헤더 필요
3. **CORS 차단** — `Access-Control-Allow-Origin`을 설정하지 않아 다른 출처의 fetch 차단

> 이 3가지로 악성 탭에서의 CSRF/무단 접근을 방지한다.

---

## 9. 실행 흐름

### CLI (`npx agentfiles`)

1. `bin/cli.ts` 실행
2. 현재 디렉토리에서 `.claude/` 탐지 → projectPath 결정
3. Hono 서버 시작 (`localhost:4321`)
4. `open` 패키지로 브라우저 자동 열기
5. `Ctrl+C`로 종료

### 개발 (`pnpm dev`)

1. tsx로 서버 실행 (watch mode)
2. Vite dev server (HMR, 프록시 → `localhost:4321/api`)
3. 코드 수정 → 서버 자동 재시작 + 프론트 HMR

---

## 10. 실제 ~/.claude/ 파일 구조 (참조)

설계 근거가 된 실제 파일 구조:

```
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

- **v2:** `config-service.ts`에 skills.sh API 클라이언트 추가, UI에 레지스트리 탭 추가
- **v3:** 서버를 클라우드 배포, 인증 레이어 추가, 같은 React 코드 재사용
- **v4:** `config-service.ts`에 Cursor, Kiro 등 멀티 에이전트 파싱 로직 추가

---

*이 문서는 2026-02-21 brainstorming 세션에서 작성됨*

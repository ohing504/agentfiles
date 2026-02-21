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
│  │Dashboard │ │ Explorer │ │  Detail  │ │ Conflict  │  │
│  │  Page    │ │  Page    │ │  Page    │ │   Page    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                         │                                │
│                    React Query                           │
│                    (데이터 fetching + 캐시)                │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP REST API
                          │ + WebSocket (파일 변경 실시간 알림)
┌─────────────────────────┴───────────────────────────────┐
│                  Local Server (Hono)                      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                 ConfigService                    │    │
│  │                                                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │    │
│  │  │ Claude   │ │ Plugin   │ │   Skill      │    │    │
│  │  │ MdParser │ │ Scanner  │ │   Scanner    │    │    │
│  │  └──────────┘ └──────────┘ └──────────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │    │
│  │  │  MCP     │ │ Command  │ │  Conflict    │    │    │
│  │  │ Scanner  │ │ Scanner  │ │  Detector    │    │    │
│  │  └──────────┘ └──────────┘ └──────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  FileWatcher  │  │  FileWriter   │                    │
│  │  (chokidar)   │  │  (CRUD ops)   │                    │
│  └──────┬────────┘  └──────────────┘                     │
└─────────┴────────────────────────────────────────────────┘
          │
    ~/.claude/  +  .claude/  (파일시스템)
```

### 핵심 데이터 흐름

1. 서버 시작 → ConfigService가 `~/.claude/` + `.claude/` 스캔
2. FileWatcher가 파일 변경 감시 → WebSocket으로 브라우저에 push
3. 브라우저에서 CRUD 요청 → REST API → FileWriter가 파일 생성/수정/삭제
4. React Query가 캐시 관리 + WebSocket 이벤트로 자동 invalidation

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
│  │  ├─ ws.ts                     ← WebSocket 핸들러
│  │  │
│  │  ├─ services/
│  │  │  ├─ config-service.ts      ← 통합 설정 조회
│  │  │  ├─ file-watcher.ts        ← chokidar 파일 감시
│  │  │  └─ file-writer.ts         ← CRUD 파일 작업
│  │  │
│  │  ├─ scanners/
│  │  │  ├─ claude-md.ts           ← CLAUDE.md 메타정보
│  │  │  ├─ plugin-scanner.ts      ← installed_plugins.json
│  │  │  ├─ mcp-scanner.ts         ← settings.json mcpServers
│  │  │  ├─ skill-scanner.ts       ← skills/ symlink + frontmatter
│  │  │  ├─ command-scanner.ts     ← commands/**/*.md
│  │  │  ├─ agent-scanner.ts       ← agents/**/*.md
│  │  │  └─ conflict-detector.ts   ← 글로벌 ↔ 프로젝트 충돌
│  │  │
│  │  └─ routes/
│  │     ├─ overview.ts
│  │     ├─ plugins.ts
│  │     ├─ mcp.ts
│  │     ├─ agents.ts
│  │     ├─ commands.ts
│  │     ├─ skills.ts
│  │     ├─ files.ts
│  │     └─ conflicts.ts
│  │
│  ├─ web/
│  │  ├─ main.tsx
│  │  ├─ App.tsx
│  │  ├─ hooks/
│  │  │  ├─ use-config.ts          ← React Query 훅
│  │  │  └─ use-websocket.ts       ← WebSocket 연결
│  │  ├─ pages/
│  │  │  ├─ Dashboard.tsx
│  │  │  ├─ Explorer.tsx
│  │  │  ├─ PluginDetail.tsx
│  │  │  ├─ McpDetail.tsx
│  │  │  └─ ConflictView.tsx
│  │  ├─ components/
│  │  │  ├─ ui/                    ← shadcn 컴포넌트
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ FileTree.tsx
│  │  │  ├─ ScopeBadge.tsx
│  │  │  └─ ConflictBanner.tsx
│  │  └─ lib/
│  │     └─ api-client.ts
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

// ── 충돌 ──
interface Conflict {
  type: 'agent' | 'command' | 'skill' | 'plugin' | 'mcp';
  name: string;
  global: { path: string; scope: 'global' };
  project: { path: string; scope: 'project' };
  resolution?: 'use-global' | 'use-project' | 'unresolved';
}

// ── 대시보드 ──
interface Overview {
  claudeMd: { global?: ClaudeMd; project?: ClaudeMd };
  plugins: { total: number; user: number; project: number };
  mcpServers: { total: number; global: number; project: number };
  agents: { total: number; global: number; project: number };
  commands: { total: number; global: number; project: number };
  skills: { total: number; global: number; project: number };
  conflicts: Conflict[];
  recentChanges: { path: string; type: string; changedAt: Date }[];
}

// ── WebSocket ──
type WsEvent =
  | { type: 'file-changed'; path: string; changeType: 'add' | 'change' | 'unlink' }
  | { type: 'config-updated'; section: string }
  | { type: 'conflict-detected'; conflict: Conflict };
```

---

## 5. API 설계

### REST API

```
GET    /api/overview                    ← 대시보드 전체 데이터

GET    /api/files/claude-md             ← 글로벌+프로젝트 CLAUDE.md 메타
GET    /api/files/claude-md/:scope/content  ← 내용 읽기
PUT    /api/files/claude-md/:scope/content  ← 내용 저장

GET    /api/plugins                     ← 전체 플러그인 목록
GET    /api/plugins/:id                 ← 플러그인 상세
PUT    /api/plugins/:id/toggle          ← enable/disable

GET    /api/mcp                         ← MCP 서버 목록
GET    /api/mcp/:name                   ← MCP 상세
PUT    /api/mcp/:name                   ← MCP 수정
DELETE /api/mcp/:name                   ← MCP 제거

GET    /api/:type                       ← 목록 (agents|commands|skills)
GET    /api/:type/:name                 ← 상세 + 내용
POST   /api/:type                       ← 생성
PUT    /api/:type/:name                 ← 수정
DELETE /api/:type/:name?scope=          ← 삭제
POST   /api/:type/:name/copy            ← 스코프 간 복사
POST   /api/:type/:name/move            ← 스코프 간 이동

GET    /api/conflicts                   ← 충돌 목록
```

### WebSocket

```
ws://localhost:4321/ws

Server → Client:
  { type: "file-changed", path, changeType }
  { type: "config-updated", section }
  { type: "conflict-detected", conflict }

Client → Server:
  { type: "subscribe", paths: string[] }
  { type: "unsubscribe", paths: string[] }
```

---

## 6. UI 화면

### 라우팅

```
/                       → Dashboard
/global/claude-md       → CLAUDE.md 편집
/global/commands        → Commands 목록
/global/plugins         → Plugins 목록
/global/plugins/:id     → Plugin 상세
/global/mcp             → MCP Servers 목록
/global/mcp/:name       → MCP 상세
/project/claude-md      → Project CLAUDE.md
/project/agents         → Agents 목록
/project/agents/:name   → Agent 상세
/conflicts              → 충돌 목록
/conflicts/:id          → 충돌 비교
```

### Webview 패널 (4개)

1. **Dashboard** — 전체 요약 (카운트 카드, 충돌 경고, 최근 변경)
2. **Plugin Detail** — 버전, 스코프, 포함된 skills, enable/disable
3. **MCP Server Detail** — command, args, env, 스코프, 상태
4. **Conflict View** — 글로벌 vs 프로젝트 side-by-side 비교

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
| 서버 | Hono |
| 서버 실행 | tsx (개발), tsup (빌드) |
| 파일 감시 | chokidar v4 |
| 프론트엔드 | React 19 |
| 빌드 | Vite |
| 라우팅 | React Router v7 |
| 데이터 페칭 | TanStack Query |
| UI 컴포넌트 | shadcn/ui |
| 스타일링 | Tailwind CSS v4 |
| 아이콘 | Lucide React |
| 마크다운 파싱 | gray-matter |
| 테스트 | Vitest |
| 린터 | Biome |

---

## 8. 실행 흐름

### CLI (`npx agentfiles`)

1. `bin/cli.ts` 실행
2. 현재 디렉토리에서 `.claude/` 탐지 → projectPath 결정
3. Hono 서버 시작 (`localhost:4321`)
4. chokidar로 `~/.claude/` + `.claude/` 감시 시작
5. `open` 패키지로 브라우저 자동 열기
6. `Ctrl+C`로 종료

### 개발 (`pnpm dev`)

1. tsx로 서버 실행 (watch mode)
2. Vite dev server (HMR, 프록시 → `localhost:4321/api`)
3. 코드 수정 → 서버 자동 재시작 + 프론트 HMR

---

## 9. 실제 ~/.claude/ 파일 구조 (참조)

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
│  └─ find-skills -> ~/.agents/skills/find-skills  ← symlink
├─ plugins/
│  ├─ installed_plugins.json          ← 모든 플러그인 메타데이터
│  ├─ config.json
│  ├─ blocklist.json
│  └─ cache/                          ← 마켓플레이스별 캐시
└─ .agents/                           ← skills 실제 파일 위치
   └─ skills/find-skills/SKILL.md
```

---

## 10. v2 확장 계획

이 설계는 다음 확장을 고려하여 만들어짐:

- **v2:** `config-service.ts`에 skills.sh API 클라이언트 추가, UI에 레지스트리 탭 추가
- **v3:** 서버를 클라우드 배포, 인증 레이어 추가, 같은 React 코드 재사용
- **v4:** `scanners/`에 cursor-scanner.ts, kiro-scanner.ts 등 추가

---

*이 문서는 2026-02-21 brainstorming 세션에서 작성됨*

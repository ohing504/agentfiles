# agentfiles 설계 문서

> 기술 아키텍처와 핵심 설계 결정을 기록한다. 제품 소개는 README.md, 기능 정의는 FEATURES.md 참조.

---

## 1. 아키텍처

```text
Browser (React SSR/CSR)
    │
    │  React Query (fetching + 캐시)
    │
    ▼  Server Functions + API Routes
TanStack Start (Vinxi/Nitro)
    │
    ├── ConfigService ─── scanMdDir() / parseJsonConfig() ──→ ~/.claude/ + .claude/
    ├── FileWriter ────── md/json 직접 저장 ─────────────────→ ~/.claude/ + .claude/
    └── Claude CLI ────── mcp add/remove, plugin toggle ────→ claude CLI
```

### 읽기/쓰기 하이브리드 전략

Claude Code CLI는 대화형 TUI를 렌더링하여 구조화된 읽기 출력이 불가하다. 반면 쓰기 명령은 비대화형으로 동작한다.

| 작업 | 방법 | 이유 |
|------|------|------|
| **읽기** | 파일 직접 파싱 | CLI가 JSON 출력 미지원 |
| **마크다운 편집** | 파일 직접 쓰기 | 단순 텍스트 파일 |
| **MCP/Plugin 조작** | CLI 위임 | 직접 JSON 수정 시 race condition 위험 |

CLI 위임으로 Claude Code의 유효성 검증과 포맷 호환성을 보장한다.

### 프론트엔드 아키텍처: 엔티티 시스템

대시보드는 **칸반 보드** 형태의 단일 페이지 앱이다. 7개 엔티티(Skill, Agent, Hook, MCP, Plugin, File, Memory)를 공통 패턴으로 처리한다.

```text
EntityConfig (설정 객체)          공통 UI Primitives              엔티티별 뷰
┌──────────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│ type, icon, actions  │────→│ EntityListPanel       │     │ SkillDetailView │
│ getKey, getLabel     │     │ EntityDetailPanel     │     │ HookDetailView  │
│ groupBy?, trailing?  │     │ Panel / DetailPanel   │     │ McpDetailView   │
│ DetailContent        │     │ (compound components) │     │ ...             │
│ toDetailTarget       │     └───────────────────────┘     └─────────────────┘
└──────────────────────┘
```

**핵심 컴포넌트:**

| 컴포넌트 | 역할 |
|---------|------|
| `EntityConfig<T>` | 엔티티별 설정 객체 (아이콘, 액션, 라벨 추출, 그룹화, 상세 뷰 컴포넌트) |
| `EntityListPanel` | 제네릭 리스트 렌더러 — flat list + groupBy 지원 |
| `EntityDetailPanel` | 제네릭 상세 패널 — config 기반 헤더/액션/콘텐츠 |
| `Panel` / `DetailPanel` | shadcn 스타일 compound components (PanelHeader, PanelTitle 등) |
| `BoardLayout` | Notion 스타일 칸반 보드 — 드래그 정렬, 스코프 행, Sheet 상세 |

**특수 렌더러:** Plugin(트리 구조)과 File(디렉토리 트리)은 전용 컴포넌트 유지.

---

## 2. 프로젝트 구조

```text
src/
  components/
    ui/                    ← shadcn primitives (Button, Sheet, ListItem 등)
    panel/                 ← Panel, DetailPanel compound components
    entity/                ← 엔티티별 DetailView (7개)
    board/                 ← BoardLayout, EntityListPanel, EntityDetailPanel, 다이얼로그
    layout/                ← Sidebar, StatusBar, AppHeader
    config-editor/         ← Settings 페이지 (ConfigPage, 카테고리별 설정)
    files-editor/          ← 파일 트리 (FileTree, FileViewerPanel)
  config/
    entity-registry.ts     ← EntityConfig 타입 + 레지스트리
    entities/              ← 7개 엔티티별 config (skill, agent, hook, mcp, plugin, memory, file)
  hooks/                   ← React Query 커스텀 훅 (use-hooks, use-mcp, use-plugins 등)
  server/                  ← Server Functions (createServerFn 기반)
  services/                ← 서버 사이드 서비스 (ConfigService, HooksService 등)
  routes/                  ← TanStack Router 라우트 (/, /settings, /api/health)
  lib/                     ← 유틸리티, 상수, 엔티티 액션/아이콘 정의
  shared/types.ts          ← 공유 타입 (Scope, AgentFile, Plugin, McpServer)
```

---

## 3. 데이터 모델

```typescript
type Scope = 'user' | 'project' | 'local' | 'managed';

interface ClaudeMd {
  scope: Scope;
  path: string;
  size: number;
  lastModified: Date;
}

interface Plugin {
  id: string;             // "superpowers@claude-plugins-official"
  name: string;
  marketplace: string;
  scope: Scope;
  version: string;
  enabled: boolean;
}

interface McpServer {
  name: string;
  scope: Scope;
  type: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

interface AgentFile {
  name: string;
  scope: Scope;
  path: string;
  namespace?: string;
  frontmatter?: Record<string, unknown>;
  type: 'agent' | 'command' | 'skill';
}

interface EntityConfig<T> {
  type: string;
  icon: LucideIcon;
  actions: EntityActionId[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  getScope?: (item: T) => string | undefined;
  groupBy?: (item: T) => string;
  trailing?: (item: T) => ReactNode;
  DetailContent: ComponentType<{ item: T }>;
  toDetailTarget: (item: T) => DashboardDetailTarget;
}
```

---

## 4. 보안

로컬 앱이지만 HTTP 서버가 열리므로 최소한의 보안 가드레일 적용:

1. **`127.0.0.1` 바인딩** — 외부 네트워크 접근 차단
2. **랜덤 토큰 인증** — 서버 시작 시 1회용 토큰 생성 → URL 파라미터로 브라우저 전달 → 이후 `Authorization: Bearer` 헤더 필수
3. **CORS 미설정** — 다른 출처의 fetch 차단

---

## 5. ~/.claude/ 파일 구조

```text
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
│  ├─ installed_plugins.json          ← 플러그인 메타데이터
│  └─ cache/                          ← 마켓플레이스별 캐시

~/.agents/                            ← skills.sh 설치 디렉토리
└─ skills/find-skills/SKILL.md
```

---

## 6. 확장 아키텍처

v1에서 2개 서비스를 추가하고, v2에서 1개를 추가한다.

```text
v0.x Services (유지)        v1 Services (추가)        v2 Services (추가)
┌────────────────┐         ┌──────────────────┐     ┌──────────────────┐
│ ConfigService  │         │ AIService        │     │ ReleaseService   │
│ FileWriter     │         │ MarketplaceService│    └──────────────────┘
│ Claude CLI     │         └──────────────────┘
│ HooksService   │
│ PluginService  │
│ McpService     │
└────────────────┘
```

### AIService

```text
- summarize(filePath, lang)   → AI 요약 카드
- translate(filePath, lang)   → 번역 프리뷰
- chat(messages, context)     → AI Guide 대화 (v2.2)
```

- v1: Claude CLI pipe 모드 (`echo "..." | claude --pipe`) — 요약/번역
- v2: Anthropic SDK (스트리밍 채팅) — AI Guide
- 캐싱: `~/.claude/agentfiles/ai-cache/{summaries,translations}/` — 파일 해시 + 언어 기반 키

### MarketplaceService

어댑터 패턴으로 skills.sh API, MCP 디렉토리, Plugin 카탈로그를 통합. 15분 TTL 캐시.

### ReleaseService

Claude Code npm 릴리즈 + 설치된 Plugin GitHub 릴리즈를 추적. AI 요약은 AIService에 위임.

---

*2026-02-21 작성, 2026-03-11 엔티티 시스템 아키텍처 반영*

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

---

## 2. 데이터 모델

```typescript
type Scope = 'global' | 'project';

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
  scope: 'user' | 'project';
  version: string;
  enabled: boolean;
}

interface McpServer {
  name: string;
  scope: Scope;
  command: string;
  args: string[];
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
```

---

## 3. 보안

로컬 앱이지만 HTTP 서버가 열리므로 최소한의 보안 가드레일 적용:

1. **`127.0.0.1` 바인딩** — 외부 네트워크 접근 차단
2. **랜덤 토큰 인증** — 서버 시작 시 1회용 토큰 생성 → URL 파라미터로 브라우저 전달 → 이후 `Authorization: Bearer` 헤더 필수
3. **CORS 미설정** — 다른 출처의 fetch 차단

---

## 4. ~/.claude/ 파일 구조

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

## 5. v2 확장 아키텍처

v2는 기존 아키텍처 위에 3개 서비스를 추가한다.

```text
v1 Services (유지)          v2 Services (추가)
┌────────────────┐         ┌──────────────────┐
│ ConfigService  │         │ AIService        │  ← 요약/번역/가이드
│ FileWriter     │         │ MarketplaceService│ ← skills.sh/MCP/Plugin 통합
│ Claude CLI     │         │ ReleaseService   │  ← npm/GitHub 릴리즈 추적
│ HooksService   │         └──────────────────┘
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

- v2.0: Claude CLI pipe 모드 (`echo "..." | claude --pipe`)
- v2.2+: Anthropic SDK (스트리밍 채팅)
- 캐싱: `~/.claude/agentfiles/ai-cache/{summaries,translations}/` — 파일 해시 + 언어 기반 키

### MarketplaceService

어댑터 패턴으로 skills.sh API, MCP 디렉토리, Plugin 카탈로그를 통합. 15분 TTL 캐시.

### ReleaseService

Claude Code npm 릴리즈 + 설치된 Plugin GitHub 릴리즈를 추적. AI 요약은 AIService에 위임.

---

*2026-02-21 작성, 2026-03-04 v2 방향성 재정의 시 업데이트*

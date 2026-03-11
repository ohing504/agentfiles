# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**멀티 에이전트** 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼. `npx agentfiles` 실행 시 `localhost:4747`에서 Chrome 앱 모드로 로컬 웹앱이 열리며, `~/.claude/`, `~/.codex/`, `~/.agents/` 및 프로젝트별 워크플로우를 통합 관리한다.

현재 상태 및 로드맵은 `docs/WORK.md` 참조.

## Current Priority

**v1 정식 릴리즈를 향해 개발 중** — 상세 일정은 `docs/WORK.md` 참조

v1 남은 목표:
- 디자인 개선 (Codex App / Claude Desktop / Notion 참고)
- AI 요약 카드 (Claude CLI pipe)
- 마켓플레이스 (skills.sh 연동)

핵심 원칙:
- 순수 shadcn/ui — 커스텀 스타일, 색상 변경 없음
- skills.sh를 설치 백엔드로 활용 (자체 마켓플레이스 구현 X)
- 뷰어/모니터링 중심 — 수정(에디팅)은 IDE 위임

## Key Documents

- `docs/FEATURES.md` — 제품 요구사항 및 로드맵 (what)
- `docs/ARCHITECTURE.md` — 기술 설계 (how)
- `docs/REFERENCES.md` — 경쟁 프로젝트, 참조 모델, 영감
- `docs/agents/DASHBOARD-DESIGN-SYSTEM.md` — 대시보드 패널 디자인 시스템
- `docs/WORK.md` — 진행 중·예정·완료 작업 목록

## Architecture

```text
Browser (React SSR) → Server Functions → 파일시스템
                                       → Claude CLI (MCP/Plugin)
```

- **프레임워크**: TanStack Start (Vinxi/Nitro 기반 풀스택)
- **읽기**: ConfigService가 파일 직접 파싱 (`scanMdDir()` for md, `parseJsonConfig()` for json)
- **마크다운 쓰기**: FileWriter가 직접 저장
- **MCP/Plugin 쓰기**: Claude CLI 위임 (`claude mcp add/remove`, `claude plugin enable/disable`)
- **API 라우트**: `createFileRoute` + `server.handlers` (TanStack Start 방식)
- **데이터 동기화**: React Query polling (`refetchOnWindowFocus` + `refetchInterval`)

## Tech Stack

- TypeScript (strict), pnpm, Node.js >= 20
- Framework: TanStack Start (Router + Server Functions + Vinxi/Nitro)
- Frontend: React 19, TanStack Query, shadcn/ui (Radix Nova), Tailwind CSS v4
- Markdown: gray-matter (frontmatter 파싱)
- Test: Vitest
- Lint: Biome

## Development Commands

```bash
pnpm dev          # 개발 서버 (Vinxi dev, localhost:4747)
pnpm build        # 프로덕션 빌드 (Vinxi/Nitro)
pnpm start        # CLI 실행 (빌드 후 프로덕션 서버 + 브라우저)
pnpm test         # Vitest 실행
pnpm lint         # Biome check
pnpm lint:fix     # Biome check --write
pnpm typecheck    # TypeScript 타입 체크 (tsc --noEmit)
```

## Project Structure

```text
src/
  components/
    ui/                      ← shadcn primitives (Button, Sheet, ListItem 등)
    panel/                   ← Panel, DetailPanel compound components (shadcn 스타일)
    entity/                  ← 엔티티별 DetailView (7개: Hook, Skill, Mcp, Agent, Plugin, File, Memory)
    board/                   ← BoardLayout, EntityListPanel, EntityDetailPanel, Add*Dialog
    layout/                  ← Sidebar, StatusBar, AppHeader
    config-editor/           ← Settings 페이지 (ConfigPage, 카테고리별 설정)
    files-editor/            ← 파일 트리 (FileTree, FileViewerPanel)
    icons/                   ← 아이콘 컴포넌트
  config/
    entity-registry.ts       ← EntityConfig<T> 타입 + 레지스트리
    entities/                ← 7개 엔티티별 config (skill, agent, hook, mcp, plugin, memory, file)
  hooks/                     ← React Query 커스텀 훅 (use-hooks, use-mcp, use-plugins 등)
  server/                    ← Server Functions (createServerFn 기반)
    hooks.ts, agents.ts, skills.ts, mcp-fns.ts, plugins-fns.ts, files.ts
    overview.ts, claude-md.ts, config-settings.ts, memory.ts
    config.ts, validation.ts, middleware/auth.ts
  services/                  ← 서버 사이드 서비스 (ConfigService, HooksService 등)
  routes/                    ← TanStack Router 라우트 (/, /settings, /api/health)
    __root.tsx               ← 루트 레이아웃
    index.tsx                ← Dashboard (/)
    settings/                ← Settings 페이지
    api/                     ← API 라우트
  lib/                       ← 유틸리티, 상수, 엔티티 액션/아이콘 정의
  shared/types.ts            ← 공유 타입 (Scope, AgentFile, Plugin, McpServer)
messages/                    ← i18n 메시지 (en/ko)
bin/cli.ts                   ← CLI 진입점
tests/                       ← 테스트
```

## Quality Checks (작업 완료 전 필수)

코드 변경 후 커밋 전에 반드시 다음을 확인:

1. `pnpm lint` — Biome 린트 통과
2. `pnpm typecheck` — TypeScript 타입 체크 통과
3. `pnpm test` — 테스트 통과
4. `pnpm build` — 프로덕션 빌드 성공

## Claude CLI 서버 호출 (서버 사이드)

- `execFile` 대신 `spawn` + `stdio: ['ignore', 'pipe', 'pipe']` 사용 — Nitro dev 서버는 TTY 없음, `execFile`로 `claude` CLI 호출 시 stdin 대기로 hanging 발생
- `claude mcp list`는 반드시 프로젝트 디렉토리(`cwd`)에서 실행해야 project-scoped 서버 반환
- MCP disabled 상태는 `.mcp.json`의 `disabled` 필드가 아닌 `~/.claude.json` → `projects.{path}.disabledMcpServers[]`에 저장됨

## Conventions

- 한국어로 설명, 존댓말 사용
- Server Functions (`createServerFn`)으로 타입 안전한 서버 호출
- API 라우트는 `createFileRoute` + `server.handlers` 사용
- 글로벌(`~/.claude/`) vs 프로젝트(`.claude/`) 스코프 구분은 ScopeBadge로 표시
- 충돌 감지는 전용 시스템 없이 badge로 처리
- 보안: 127.0.0.1 바인딩, 랜덤 토큰 인증, CORS 미설정
- 개발 서버 실행 시 Chrome 앱 모드(`--app`)로 열기

## Development Guidelines

- 개발 시 andrej-karpathy-skills 의 가이드라인을 따를 것
- context7 을 활용해서 최신 문서 기반으로 official 권장 사항을 따를 것
- web search, context7 등을 통해 best practice 를 따를 것
- 확장에 대비하는 것은 좋지만 과도한 오버엔지니어링을 피할 것

### Plan Document Convention
- 설계 문서 (`*-design.md`): 완료 시 Status를 `Completed`로 변경, 각 항목에 Done 표시
- 실행 문서 (implementation plan): 완료 시 상세 태스크 단계를 제거하고 Summary만 유지
- 완료된 문서는 정리하여 간결하게 유지

### Commit Convention
- Use English for all commit messages, PR titles, and issue comments
- Format: `type(scope): description`
- 커밋 전에는 항상 물어볼것

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agentfiles는 AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼이다. `npx agentfiles` 실행 시 `localhost:3000`에서 Chrome 앱 모드로 로컬 웹앱이 열리며, `~/.claude/`와 프로젝트별 `.claude/` 설정을 GUI로 관리한다.

현재 상태: Phase 1 완료 (프로젝트 초기화), Phase 2 개발 중

## Key Documents

- `PRD.md` — 제품 요구사항 (what)
- `docs/plans/2026-02-21-agentfiles-v1-design.md` — v1 기술 설계 (how)
- `docs/plans/2026-02-21-agentfiles-v1-tasks.md` — v1 개발 태스크

## Architecture

```
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
pnpm dev          # 개발 서버 (Vinxi dev, localhost:3000)
pnpm build        # 프로덕션 빌드 (Vinxi/Nitro)
pnpm test         # Vitest 실행
pnpm lint         # Biome check
pnpm lint:fix     # Biome check --write
```

## Project Structure

```
src/
  routes/                    ← TanStack Start 파일 기반 라우팅
    __root.tsx               ← 루트 레이아웃
    index.tsx                ← Dashboard (/)
    api/                     ← API Routes (server.handlers)
      health.ts              ← GET /api/health
  services/                  ← 서버 사이드 서비스
    config-service.ts        ← 파일 읽기
    file-writer.ts           ← 마크다운 쓰기
    claude-cli.ts            ← CLI 위임
  server/                    ← Server Functions (createServerFn)
    overview.ts              ← getOverview()
  components/                ← UI 컴포넌트
    ui/                      ← shadcn 컴포넌트
  lib/                       ← 유틸리티
  shared/                    ← 공유 타입
    types.ts
bin/                         ← CLI 진입점
  cli.ts
tests/                       ← 테스트
```

## Conventions

- 한국어로 설명, 존댓말 사용
- Server Functions (`createServerFn`)으로 타입 안전한 서버 호출
- API 라우트는 `createFileRoute` + `server.handlers` 사용
- 글로벌(`~/.claude/`) vs 프로젝트(`.claude/`) 스코프 구분은 ScopeBadge로 표시
- 충돌 감지는 전용 시스템 없이 badge로 처리
- 보안: 127.0.0.1 바인딩, 랜덤 토큰 인증, CORS 미설정
- 개발 서버 실행 시 Chrome 앱 모드(`--app`)로 열기

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agentfiles는 AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼이다. `npx agentfiles` 실행 시 `localhost:4321`에서 로컬 웹앱이 열리며, `~/.claude/`와 프로젝트별 `.claude/` 설정을 GUI로 관리한다.

현재 상태: 설계 완료, 개발 준비 중 (v1)

## Key Documents

- `PRD.md` — 제품 요구사항 (what)
- `docs/plans/2026-02-21-agentfiles-v1-design.md` — v1 기술 설계 (how)

## Architecture

```
Browser (React SPA) → HTTP REST API → Hono Server → 파일시스템
                                                   → Claude CLI (MCP/Plugin)
```

- **읽기**: ConfigService가 파일 직접 파싱 (`scanMdDir()` for md, `parseJsonConfig()` for json)
- **마크다운 쓰기**: FileWriter가 직접 저장
- **MCP/Plugin 쓰기**: Claude CLI 위임 (`claude mcp add/remove`, `claude plugin enable/disable`)
- **데이터 동기화**: React Query polling (`refetchOnWindowFocus` + `refetchInterval`)

## Tech Stack

- TypeScript (strict), pnpm, Node.js >= 20
- Server: Hono (RPC로 타입 안전한 클라이언트 제공)
- Frontend: React 19, Vite, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS v4
- Markdown: gray-matter (frontmatter 파싱)
- Test: Vitest
- Lint: Biome

## Development Commands

```bash
pnpm dev          # 개발 서버 (tsx watch + Vite HMR)
pnpm build        # 프로덕션 빌드 (tsup + Vite)
pnpm test         # Vitest 실행
pnpm lint         # Biome lint + format check
```

## Project Structure

```
src/server/           # Hono API 서버
  services/           # config-service, file-writer, claude-cli
  routes/             # REST API 라우트
src/web/              # React SPA
  hooks/              # TanStack Query 훅 + Hono RPC (hc)
  pages/              # Dashboard, Explorer, Detail 페이지
  components/         # shadcn/ui 기반 컴포넌트
src/shared/types.ts   # 서버-클라이언트 공유 타입
bin/cli.ts            # npx agentfiles 진입점
```

## Conventions

- 한국어로 설명, 존댓말 사용
- Hono RPC (`hc`)로 API 호출 — 별도 api-client 불필요
- 글로벌(`~/.claude/`) vs 프로젝트(`.claude/`) 스코프 구분은 ScopeBadge로 표시
- 충돌 감지는 전용 시스템 없이 badge로 처리
- 보안: 127.0.0.1 바인딩, 랜덤 토큰 인증, CORS 미설정

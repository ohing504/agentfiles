# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agentfiles는 AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼이다. `npx agentfiles` 실행 시 `localhost:3000`에서 Chrome 앱 모드로 로컬 웹앱이 열리며, `~/.claude/`와 프로젝트별 `.claude/` 설정을 GUI로 관리한다.

현재 상태: v1 개발 완료 (Phase 1-13 전체 완료)

## Key Documents

- `docs/FEATURES.md` — 제품 요구사항 및 기능 정의 (what)
- `docs/ARCHITECTURE.md` — v1 기술 설계 (how)
- `docs/RELATED-PROJECTS.md` — 경쟁/관련 프로젝트 분석

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
pnpm dev          # 개발 서버 (Vinxi dev, localhost:3000)
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
  routes/                    ← TanStack Router directory-based 라우팅
    __root.tsx               ← 루트 레이아웃 (TooltipProvider, Toaster)
    index.tsx                ← Dashboard (/)
    hooks/route.tsx          ← Hooks 에디터 (/hooks)
    skills/route.tsx         ← Skills 에디터 (/skills)
    files/route.tsx          ← 리다이렉트 → /global/files
    plugins/
      index.tsx              ← 리다이렉트 → /global/plugins
      $id/route.tsx          ← 리다이렉트
    mcp/
      index.tsx              ← 리다이렉트 → /global/mcp
      $name/route.tsx        ← 리다이렉트
    global/
      route.tsx              ← Global 레이아웃
      settings/route.tsx     ← Global Settings
      files/route.tsx        ← Global Files
      plugins/
        index.tsx            ← Global Plugins 목록
        $id/route.tsx        ← Plugin 상세
      mcp/
        index.tsx            ← Global MCP 목록
        $name/route.tsx      ← MCP 상세
    project/
      route.tsx              ← Project 레이아웃
      settings/route.tsx     ← Project Settings
      files/route.tsx        ← Project Files
      plugins/
        index.tsx            ← Project Plugins 목록
        $id/route.tsx        ← Plugin 상세
      mcp/
        index.tsx            ← Project MCP 목록
        $name/route.tsx      ← MCP 상세
    api/
      health.ts              ← GET /api/health
  features/                  ← Feature-based 모듈 (도메인별 콜로케이션)
    hooks-editor/
      components/            ← HooksPageContent, HookDetailPanel, HooksScopeSection, AddHookDialog
      api/                   ← hooks.functions.ts (server fns), hooks.queries.ts (React Query)
      constants.ts           ← HOOK_EVENT_META, HOOK_TEMPLATES, hookFormSchema
    skills-editor/
      components/            ← SkillsPageContent, SkillDetailPanel, SkillsScopeSection, AddSkillDialog, SupportingFilePanel
      api/                   ← skills.functions.ts (server fns)
      constants.tsx          ← FrontmatterBadges, addSkillSchema
  components/                ← 공유 UI 컴포넌트 (2곳 이상에서 사용)
    layout/                  ← Layout, Sidebar, StatusBar
    pages/                   ← FilesPageContent, PluginsPageContent, McpPageContent (추후 feature로 이동 예정)
    settings/                ← GlobalSettingsPage, ProjectSettingsPage
    ui/                      ← shadcn 컴포넌트
    icons/                   ← 아이콘 컴포넌트
    DetailField.tsx          ← 공유 위젯
    FileViewer.tsx           ← 파일 뷰어
    ScopeBadge.tsx           ← 스코프 배지
    ErrorBoundary.tsx        ← 에러 바운더리
    ProjectContext.tsx       ← 프로젝트 컨텍스트 프로바이더
    ProjectSwitcher.tsx      ← 프로젝트 전환 UI
    AddProjectDialog.tsx     ← 프로젝트 추가 다이얼로그
    LanguageSwitcher.tsx     ← 언어 전환 (en/ko)
  services/                  ← 서버 사이드 서비스
    config-service.ts        ← 파일 읽기 (md 스캔 + json 파싱 + settings 읽기)
    file-writer.ts           ← 마크다운/JSON 쓰기
    claude-cli.ts            ← CLI 위임 + npm registry 최신 버전 조회
    hooks-service.ts         ← settings.json hooks 섹션 CRUD
    project-store.ts         ← 프로젝트 목록 읽기/쓰기
  server/                    ← 공유 Server Functions (createServerFn)
    overview.ts, claude-md.ts, plugins.ts, mcp.ts, items.ts
    settings.ts, projects.ts, cli-status.ts
    config.ts                ← 경로 헬퍼, 토큰, CLI 탐색
    validation.ts            ← 입력 검증 (path traversal 방지)
    middleware/auth.ts       ← Bearer 토큰 인증 미들웨어
  hooks/                     ← 공유 React 커스텀 훅
    use-config.ts            ← TanStack Query 데이터 훅 (useAgentFiles 등)
    use-claude-md-files.ts   ← CLAUDE.md 파일 목록 훅
    use-projects.ts          ← 프로젝트 관리 훅
  lib/                       ← 유틸리티
    auth.ts, query-keys.ts, format.ts
  shared/types.ts            ← 공유 타입
messages/                    ← i18n 메시지 (en.json, ko.json)
bin/cli.ts                   ← CLI 진입점
tests/                       ← 테스트
```

## Quality Checks (작업 완료 전 필수)

코드 변경 후 커밋 전에 반드시 다음을 확인:

1. `pnpm lint` — Biome 린트 통과
2. `pnpm typecheck` — TypeScript 타입 체크 통과
3. `pnpm test` — 테스트 통과
4. `pnpm build` — 프로덕션 빌드 성공

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

### Commit Convention
- Use English for all commit messages, PR titles, and issue comments
- Format: `type(scope): description`
- 커밋 전에는 항상 물어볼것

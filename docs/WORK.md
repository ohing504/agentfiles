# WORK.md

## Shipping This Week

## Blocked

## Next Up

### v2.0 — Foundation (이해 레이어 + UI 재설계)

- [ ] **UI 전면 재설계** — shadcn/ui 기반 심플한 레이아웃, 마켓플레이스/AI Guide 자리 마련
- [ ] **선호 언어 설정** — Settings에 preferred language 추가
- [ ] **AI 요약 카드** — skill/hook/plugin/MCP에 대한 선호 언어 요약 자동 생성 (Claude CLI pipe 모드)
  - 상세 패널에 Overview 탭 추가: 트리거 조건, 핵심 동작, 커스터마이징 포인트
  - 로컬 캐시 (파일 해시 + 선호 언어 기반, 변경 시 자동 무효화)
- [ ] **번역 프리뷰** — 영어 원본 파일의 선호 언어 번역 탭 (원문/번역 전환)
- [ ] **Release Notes Hub** — Claude Code npm 릴리즈 + 설치된 plugin GitHub 릴리즈 추적, AI 요약
- [ ] **AIService** — `src/services/ai-service.ts` (요약/번역 담당, 캐싱)
- [ ] **ReleaseService** — `src/services/release-service.ts` (npm/GitHub API 릴리즈 추적)

### v2.1 — Marketplace

- [ ] **Skills 마켓플레이스** — skills.sh API 연동, 검색/설치/제거
- [ ] **MCP 서버 디렉토리** — curated 목록 (`data/mcp-servers.json`), 원클릭 설치
- [ ] **Plugin 카탈로그** — 사용 가능한 plugin 브라우징
- [ ] **"이미 설치됨" 연동** — 마켓 ↔ 로컬 설치 상태 동기화
- [ ] **설치 시 AI 요약 자동 생성** — 설치 직후 바로 이해 가능
- [ ] **MarketplaceService** — `src/services/marketplace-service.ts` (어댑터 패턴 통합)

### v2.2 — AI Guide + Recipes

- [ ] **AI Guide 채팅** — 내 설정을 인지하는 AI 어시스턴트 (Anthropic SDK 스트리밍)
- [ ] **Workflow Recipes** — 검증된 워크플로우 조합 패키지 (skills + hooks + CLAUDE.md)
- [ ] **개선 제안** — 현재 설정 분석 → 개선점 추천
- [ ] **AI 지원 편집** — AI가 skill/hook 파일 수정안 생성 + 미리보기

### v1 Backlog (유지)

- [ ] 추가 공유 컴포넌트 — `McpServerDetailView`, `LspServerDetailView`
- [ ] Files 뷰어 숨김 패턴 사용자 설정 — `agentfiles.json`에 `files.exclude` 패턴 배열 지원

## Shipped

- **config-service 분리 + 테스트 co-location** (2026-02-27) — agent-file-service, overview-service 추출. 전체 유닛 테스트를 `tests/` → 소스 파일 옆으로 co-locate. 235개 테스트 통과.
- **Files 프로젝트 루트 Claude 파일 표시** (2026-02-27) — project scope에서 `CLAUDE.md`, `AGENTS.md`, `.agents`, `.cursorrules` 등 루트 파일도 트리에 표시. 디렉토리 우선 정렬.
- **files-editor 리팩토링** (2026-02-27) — `.claude/` 전체 파일 탐색기 + 읽기 전용 뷰어로 전면 재작성. feature-local 서비스, FilesContext, `/files` 단일 라우트 통합.
- **config-editor** (2026-02-26) — Settings → Configuration 에디터로 교체. VSCode 스타일 3단 레이아웃, 6개 카테고리, 957줄 제거.
- **mcp-editor 리팩토링** (2026-02-26) — EDITOR-GUIDE.md 패턴 적용, `/mcp` 단일 라우트 통합, McpDetailPanel 공유화.
- **공유 DetailPanel + Flutter-style 콜백** (2026-02-26) — HookDetailPanel/SkillDetailPanel 공유화, `onEdit?`/`onDelete?` 콜백 패턴, hook-utils.ts 추출.
- **hooks-editor / skills-editor 리팩토링** (2026-02-26) — EDITOR-GUIDE.md 패턴 통일, Context 기반 상태 관리.
- **plugin-service 분리** (2026-02-25) — config-service.ts 839줄 → plugin-service.ts + config-service.ts 분리.

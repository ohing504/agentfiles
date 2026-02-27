# WORK.md

## Shipping This Week

## Blocked

## Next Up

### config-service.ts 분리 리팩토링 (계속)
- [x] `services/plugin-service.ts` — `getPlugins`, `readPluginManifest`, `scanPluginComponents`, `getMarketplaces` + 헬퍼
- [x] `services/mcp-service.ts` — `getMcpServers`, `parseMcpServers`
- [x] `services/agent-file-service.ts` — `scanMdDir`, `scanSkillsDir`, `getAgentFiles`
- [x] `services/overview-service.ts` — `getOverview`
- [x] `services/config-service.ts` — 경로 헬퍼, `getClaudeMd` (최종 정리)

### 테스트 co-location (계속)
- [x] `plugin-contents.test.ts` + `config-service.test.ts` plugin 부분 → `src/services/plugin-service.test.ts`
- [x] `tests/services/hooks-service.test.ts` → `src/services/hooks-service.test.ts`
- [x] 나머지 유닛 테스트를 `tests/` 에서 소스 파일 옆으로 이동
- [x] vitest config에서 include 경로 확인 (src/**/*.test.ts 포함)

### 추후 개선 (Backlog)
- [ ] **i18n 메시지 파일 구조 개선 및 공통 텍스트 최적화**
  - 현황: `messages/en.json` 단일 파일에 257개 키가 flat 구조로 관리 (`hooks_*` 52개, `plugin_*` 47개, `mcp_*` 34개 등)
  - 문제: feature가 늘수록 파일이 비대해지고, 유사한 공통 텍스트가 feature별로 중복됨
    - 예) `*_scope_global/project`, `*_no_selection`, `*_loading`, `*_delete` 등이 feature마다 반복
    - `scope`, `detail`, `editor`, `action` prefix(각 5개 이하)는 공유 키로 통합 가능
  - 개선 방향:
    - 공통 키 분리: `common_*` namespace로 scope 탭 레이블·empty state·로딩·삭제 확인 등 재사용 텍스트 통합
    - Feature별 네임스페이스 정리: `hooks_`, `plugin_`, `mcp_`, `skills_`, `files_`, `config_` — feature 모듈 구조와 1:1 대응
    - 장기적으로 paraglide 네임스페이스 또는 feature별 메시지 파일 분리 검토
- [ ] 플러그인 검색 입력에 `useDeferredValue` 적용 (#13)
- [ ] 추가 공유 컴포넌트 — `McpServerDetailView`, `LspServerDetailView`
- [ ] Files 뷰어 숨김 패턴 사용자 설정 — `agentfiles.json`에 `files.exclude` 패턴 배열 지원 (`.vscode/settings.json`의 `files.exclude` 같은 방식). 사용자가 보고 싶지 않은 폴더/파일을 직접 설정할 수 있도록

## 마켓플레이스
- 별도 마켓플레이스 페이지 구성 필요 (plugins에서 분리)
- plugins, skills 등을 마켓플레이스에서 검색/설치할 수 있도록

### MCP Servers 마켓플레이스
- 알려진 MCP 서버 목록을 JSON/YAML 파일로 관리 (레포 내 `data/mcp-servers.json` 등)
- GUI에서 마켓플레이스 리스트 표시 → 클릭으로 설치 (설정 파일 자동 수정)
- 각 서버별 메타데이터: name, description, install command, supported agents (Claude/Cursor/Windsurf 등), config template
- 오픈소스이므로 커뮤니티 PR로 서버 추가 가능
- 여러 AI 에이전트별 설정 방식 차이를 추상화 (각 에이전트의 MCP config 위치/형식 자동 감지)
- 현재 문제: 프로젝트마다 MCP 서버 검색 → 설정방법 확인 → 에이전트별 수동 설치가 반복적이고 번거로움

## Shipped

- **config-service 분리 + 테스트 co-location** (2026-02-27) — agent-file-service, overview-service 추출. 전체 유닛 테스트를 `tests/` → 소스 파일 옆으로 co-locate. 235개 테스트 통과.
- **Files 프로젝트 루트 Claude 파일 표시** (2026-02-27) — project scope에서 `CLAUDE.md`, `AGENTS.md`, `.agents`, `.cursorrules` 등 루트 파일도 트리에 표시. 디렉토리 우선 정렬.
- **files-editor 리팩토링** (2026-02-27) — `.claude/` 전체 파일 탐색기 + 읽기 전용 뷰어로 전면 재작성. feature-local 서비스, FilesContext, `/files` 단일 라우트 통합.
- **config-editor** (2026-02-26) — Settings → Configuration 에디터로 교체. VSCode 스타일 3단 레이아웃, 6개 카테고리, 957줄 제거.
- **mcp-editor 리팩토링** (2026-02-26) — EDITOR-GUIDE.md 패턴 적용, `/mcp` 단일 라우트 통합, McpDetailPanel 공유화.
- **공유 DetailPanel + Flutter-style 콜백** (2026-02-26) — HookDetailPanel/SkillDetailPanel 공유화, `onEdit?`/`onDelete?` 콜백 패턴, hook-utils.ts 추출.
- **hooks-editor / skills-editor 리팩토링** (2026-02-26) — EDITOR-GUIDE.md 패턴 통일, Context 기반 상태 관리.
- **plugin-service 분리** (2026-02-25) — config-service.ts 839줄 → plugin-service.ts + config-service.ts 분리.

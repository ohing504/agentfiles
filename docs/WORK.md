# WORK.md

## Shipping This Week

## Blocked

## Next Up

### config-service.ts 분리 리팩토링 (계속)
- [x] `services/plugin-service.ts` — `getPlugins`, `readPluginManifest`, `scanPluginComponents`, `getMarketplaces` + 헬퍼
- [ ] `services/mcp-service.ts` — `getMcpServers`, `parseMcpServers`
- [ ] `services/agent-file-service.ts` — `scanMdDir`, `scanSkillsDir`, `getAgentFiles`
- [ ] `services/overview-service.ts` — `getOverview`
- [ ] `services/config-service.ts` — 경로 헬퍼, `getClaudeMd` (최종 정리)

### 테스트 co-location (계속)
- [x] `plugin-contents.test.ts` + `config-service.test.ts` plugin 부분 → `src/services/plugin-service.test.ts`
- [x] `tests/services/hooks-service.test.ts` → `src/services/hooks-service.test.ts`
- [ ] 나머지 유닛 테스트를 `tests/` 에서 소스 파일 옆으로 이동
- [ ] vitest config에서 include 경로 확인 (src/**/*.test.ts 포함)

### 추후 개선 (Backlog)
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

### files-editor 리팩토링 (2026-02-27)
- 기존 Files 페이지를 `.claude/` 디렉토리 전체 파일 탐색기 + 읽기 전용 뷰어로 전면 리팩토링
- feature-local 서비스 (`files-scanner.service.ts`) — 디렉토리 재귀 스캔 + 제외 패턴
- Server Functions + React Query + FilesContext 패턴 (EDITOR-GUIDE.md 준수)
- 5개 UI 컴포넌트: FilesPage, FilesPageContent, FilesScopeTabs, FileTree, FileViewerPanel
- 사이드바: Files를 top-level 네비게이션에 추가, Global/Project 그룹 제거
- `/files` 단일 라우트 통합 (`/global/files`, `/project/files` → 리다이렉트)
- 기존 `FilesPageContent.tsx` 삭제
- co-located 테스트 12개 (files-scanner.service)

### config-editor — Configuration 에디터 (2026-02-26)
- 기존 Settings 페이지를 공식 Claude Code 문서 기반 Configuration 에디터로 전면 교체
- VSCode 스타일 3단 레이아웃: Scope 탭(User/Project/Local) + 카테고리 nav + 설정 폼
- 6개 카테고리: General, Permissions, Environment, Sandbox, UI/Display, Authentication
- feature-local 서비스 (`config-settings.service.ts`) — dot-notation 중첩 키 CRUD
- Server Functions + React Query + ConfigContext 패턴 (EDITOR-GUIDE.md 준수)
- 기존 `GlobalSettingsPage`, `ProjectSettingsPage`, `src/server/settings.ts` 삭제 (957줄 제거)
- 사이드바: Configuration을 top-level 네비게이션에 추가, Global/Project Settings 항목 제거
- Layout 브레드크럼 전면 제거 (각 feature editor가 자체 헤더 관리)
- co-located 테스트 19개 (service 12 + constants 7)
- 218 tests 통과, 빌드 성공

### mcp-editor 리팩토링 (2026-02-26)
- EDITOR-GUIDE.md 패턴에 맞춰 feature 모듈로 리팩토링
- `/global/mcp` + `/project/mcp` → `/mcp` 단일 라우트 통합
- 공유 McpDetailPanel 추출 (mcp-editor + plugins-editor 재사용)
- VSCode/Cursor 에디터 열기 메뉴 (plugins-editor 패턴 통일)

### 공유 DetailPanel 통합 + Flutter-style 콜백 패턴 (2026-02-26)
- `HookDetailPanel` 공유화: hooks-editor (편집+삭제) + plugins-editor (읽기 전용)
- `SkillDetailPanel` 공유화: skills-editor (삭제) + plugins-editor (읽기 전용)
- Flutter-style 콜백: `onEdit?`/`onDelete?` 존재 여부로 버튼 표시 제어 (boolean prop 제거)
- `hook-utils.ts` 추출: `isHookFilePath()` + `resolveHookFilePath()` (3곳 중복 제거)
- `$CLAUDE_PLUGIN_ROOT` 변수 해석으로 plugins-editor에서 Open in Editor 정상 동작
- feature 내부 ActionBar/DetailPanel 삭제 (HookActionBar, SkillActionBar, 기존 feature-local DetailPanel)
- EDITOR-GUIDE.md + CLAUDE.md 문서 업데이트

### hooks-editor 리팩토링 (2026-02-26)
- plugins-editor 패턴에 맞춰 구조 통일 (EDITOR-GUIDE.md 기반)
- `HooksPageContent` → Context 기반으로 상태 제거 (5 useState → 1 searchQuery)
- Feature-local query keys: `queryKeys.hooks` → `hookKeys` (hooks.queries.ts 내)
- ErrorBoundary + Provider 래퍼 (HooksPage.tsx)

### skills-editor 리팩토링 (2026-02-26)
- plugins-editor 패턴에 맞춰 구조 통일 (EDITOR-GUIDE.md 기반)
- SkillsScopeSection: prop drilling → Context 전환

### plugin-service 분리 (2026-02-25)
- config-service.ts (839줄) → plugin-service.ts (335줄) + config-service.ts (558줄)
- 테스트 co-locate: src/services/plugin-service.test.ts (34개 테스트)

# WORK.md

## Shipping This Week

## Blocked

## Next Up

### config-service.ts 분리 리팩토링 (계속)
- [x] `services/plugin-service.ts` — `getPlugins`, `readPluginManifest`, `scanPluginComponents`, `getMarketplaces` + 헬퍼
- [ ] `services/mcp-service.ts` — `getMcpServers`, `parseMcpServers`
- [ ] `services/agent-file-service.ts` — `scanMdDir`, `scanSkillsDir`, `getAgentFiles`
- [ ] `services/overview-service.ts` — `getOverview`
- [ ] `services/settings-service.ts` — `readSettingsJson`, `readClaudeAppJson`, `readProjectLocalSettings`
- [ ] `services/config-service.ts` — 경로 헬퍼, `getClaudeMd` (최종 정리)

### 테스트 co-location (계속)
- [x] `plugin-contents.test.ts` + `config-service.test.ts` plugin 부분 → `src/services/plugin-service.test.ts`
- [x] `tests/services/hooks-service.test.ts` → `src/services/hooks-service.test.ts`
- [ ] 나머지 유닛 테스트를 `tests/` 에서 소스 파일 옆으로 이동
- [ ] vitest config에서 include 경로 확인 (src/**/*.test.ts 포함)

### skills-editor 리팩토링 (plugins-editor 패턴으로 통일)
- [x] skills-editor를 plugins-editor 구조에 맞춰 리팩토링 (context, api, components 분리)
- [x] queryFn 파라미터화 — queryKey에 의존성 포함 (plugins-editor 패턴 참고)
- [x] 공유 상세 컴포넌트 추출 — `SkillDetailView`, `AgentFileView`, `useAgentFileDetailQuery`
  - plugins의 `PluginComponentDetail`에서 `SkillDetailView` 재사용 (실제 파일 내용 표시)
- [ ] 추가 공유 컴포넌트 — `HookDetailView`, `McpServerDetailView`, `LspServerDetailView`
- **주의**: server function handler 내 `@/services/*` import는 반드시 dynamic import 유지 (Node.js 전용 모듈이 클라이언트 번들에 포함되면 깨짐) — `docs/EDITOR-GUIDE.md` 참조

### hooks-editor 리팩토링
- [x] **주의**: `hooks.functions.ts` handler 내 dynamic import 유지 필수 (static으로 바꾸면 클라이언트 번들 깨짐)
- [x] hooks-editor를 plugins-editor 패턴에 맞춰 구조 개선

### 추후 개선 (Backlog)
- [x] AgentFileDetail: synthetic markdown 대신 실제 파일 내용 표시 (#18) — SkillDetailView로 교체
- [ ] 플러그인 검색 입력에 `useDeferredValue` 적용 (#13)

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

### hooks-editor 리팩토링 (2026-02-26)
- plugins-editor 패턴에 맞춰 구조 통일 (EDITOR-GUIDE.md 기반)
- 신규 파일: `hooks.queries.ts` 분리(useHooksQuery/useHooksMutations/useHookScriptQuery), `context/HooksContext.tsx`, `HookActionBar.tsx`, `HooksPage.tsx`
- `HooksPageContent` → Context 기반으로 상태 제거 (5 useState → 1 searchQuery)
- `AddHookDialog` → mutation props 제거, 내부에서 직접 useHooksMutations 호출
- `HookDetailPanel` → 인라인 쿼리 제거, useHookScriptQuery 사용
- Feature-local query keys: `queryKeys.hooks` → `hookKeys` (hooks.queries.ts 내)
- ErrorBoundary + Provider 래퍼 (HooksPage.tsx)
- HooksScopeSection memo() 최적화
- 테스트 co-location: `tests/services/hooks-service.test.ts` → `src/services/hooks-service.test.ts`
- 196 tests 통과, 빌드 성공

### 공유 상세 컴포넌트 추출 (2026-02-26)
- `SkillDetailView` (self-fetching, src/components/) — skills-editor + plugins-editor 공유
- `AgentFileView` (순수 표시, src/components/) — supporting file 뷰어
- `useAgentFileDetailQuery` (src/hooks/) — path 기반 파일 읽기
- `FrontmatterBadges` → src/components/ 이동, `extractBody` → src/lib/format.ts 이동
- plugins-editor `AgentFileDetail`(합성md) → `SkillDetailView`(실제 내용) 교체
- skills/hooks `label="Global"` → `label="User"` 용어 통일
- 196 tests 통과, 빌드 성공

### skills-editor 리팩토링 (2026-02-26)
- plugins-editor 패턴에 맞춰 구조 통일 (EDITOR-GUIDE.md 기반)
- 신규 파일: `types.ts`, `skills.queries.ts`, `context/SkillsContext.tsx`, `SkillActionBar.tsx`, `FrontmatterBadges.tsx`
- `constants.tsx` → `constants.ts` (컴포넌트 분리)
- `SkillsPageContent.tsx` → `SkillsPage.tsx` (ErrorBoundary + Provider 래퍼)
- SkillsScopeSection: prop drilling → Context 전환
- SkillDetailPanel: 인라인 query/mutation → queries 훅
- AddSkillDialog: 인라인 invalidation → createMutation
- 196 tests 통과, 빌드 성공

### plugin-service 분리 (2026-02-25)
- config-service.ts (839줄) → plugin-service.ts (335줄) + config-service.ts (558줄)
- 테스트 co-locate: src/services/plugin-service.test.ts (34개 테스트)
- 완료된 plan 파일 3개 정리

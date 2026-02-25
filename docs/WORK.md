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
- [ ] 나머지 유닛 테스트를 `tests/` 에서 소스 파일 옆으로 이동
- [ ] vitest config에서 include 경로 확인 (src/**/*.test.ts 포함)

### hooks/skills editor 개선
- [ ] hooks-editor: dynamic import → static import 전환 (`hooks.functions.ts`, `hooks.queries.ts`)
- [ ] skills-editor: dynamic import → static import 전환 (`skills.functions.ts`, `SkillDetailPanel.tsx`, `AddSkillDialog.tsx`, `SupportingFilePanel.tsx`)
- [ ] hooks/skills queryFn 파라미터화 — queryKey에 의존성 포함 (plugins-editor 패턴 참고)

## 마켓플레이스
- 별도 마켓플레이스 페이지 구성 필요 (plugins에서 분리)
- plugins, skills 등을 마켓플레이스에서 검색/설치할 수 있도록

## Shipped

### plugin-service 분리 (2026-02-25)
- config-service.ts (839줄) → plugin-service.ts (335줄) + config-service.ts (558줄)
- 테스트 co-locate: src/services/plugin-service.test.ts (34개 테스트)
- 완료된 plan 파일 3개 정리

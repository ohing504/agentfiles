# WORK.md

## Shipping This Week

## Blocked

## Next Up

### config-service.ts 분리 리팩토링
- [ ] `config-service.ts` (800+ lines) → 목적별 모듈로 분리:
  - `services/plugin-service.ts` — `getPlugins`, `readPluginManifest`, `scanPluginComponents`, `getMarketplaces`
  - `services/mcp-service.ts` — `getMcpServers`, `parseMcpServers`
  - `services/agent-file-service.ts` — `scanMdDir`, `scanSkillsDir`, `getAgentFiles`
  - `services/overview-service.ts` — `getOverview`
  - `services/settings-service.ts` — `readSettingsJson`, `readClaudeAppJson`, `readProjectLocalSettings`
  - `services/config-service.ts` — 경로 헬퍼 (`getGlobalConfigPath`, `getProjectConfigPath`), `getClaudeMd`
- [ ] 분리 시 테스트도 함께 co-locate: `services/plugin-service.test.ts` 등

### 테스트 co-location
- [ ] 유닛 테스트를 `tests/` 에서 소스 파일 옆으로 이동 (예: `src/lib/format.test.ts`)
- [ ] `tests/services/config-service.test.ts` → config-service 분리 후 각 서비스 옆에 배치
- [ ] `tests/services/plugin-contents.test.ts` → `services/plugin-service.test.ts`
- [ ] vitest config에서 include 경로 확인 (src/**/*.test.ts 포함)

### hooks/skills editor 개선
- [ ] hooks-editor: dynamic import → static import 전환 (`hooks.functions.ts`, `hooks.queries.ts`)
- [ ] skills-editor: dynamic import → static import 전환 (`skills.functions.ts`, `SkillDetailPanel.tsx`, `AddSkillDialog.tsx`, `SupportingFilePanel.tsx`)
- [ ] hooks/skills queryFn 파라미터화 — queryKey에 의존성 포함 (plugins-editor 패턴 참고)

## 마켓플레이스
- 별도 마켓플레이스 페이지 구성 필요 (plugins에서 분리)
- plugins, skills 등을 마켓플레이스에서 검색/설치할 수 있도록

## Shipped

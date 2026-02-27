# Plugin MCP Visibility in MCP Servers Page

**Date:** 2026-02-27
**Status:** Approved

## Background

Claude Code에서 플러그인 MCP 서버는 `~/.claude/plugins/cache/{plugin}/.mcp.json`에 저장되며, 직접 추가한 MCP 서버(`~/.claude.json`, `.mcp.json`)와는 별도로 로드된다. 현재 agentfiles의 MCP Servers 페이지는 직접 추가된 서버만 표시하고, 플러그인 MCP 서버는 Plugins 페이지에서만 확인 가능하다.

### 문제

- context7처럼 플러그인으로 설치된 MCP 서버와 프로젝트 `.mcp.json`에 직접 설정된 서버가 **동시에 로드**되어 중복이 발생해도 MCP Servers 페이지에서 확인 불가
- Project scope `.mcp.json`이 User scope 플러그인보다 우선 적용되므로 플러그인 버전은 사실상 무시됨
- 팀 공유 프로젝트의 경우 `.mcp.json`에 유지가 맞고, 개인 프로젝트는 플러그인만으로 충분 — 현재 UI에선 이를 판단할 정보가 없음

### 검증된 사실

- `~/.claude.json`의 `mcpServers` 필드는 직접 추가한 것만 포함 (플러그인 설치 시 이 필드에 추가되지 않음)
- 플러그인 MCP는 `installed_plugins.json` + 플러그인 캐시 `.mcp.json`에서 런타임에 로드
- `McpServer.fromPlugin?: string` 필드가 이미 타입에 정의되어 있으나 미사용 상태

---

## 설계

### 핵심 원칙

1. MCP Servers 페이지 = MCP 서버의 **전체 그림**을 보는 곳 (플러그인 포함)
2. 플러그인에서 온 서버는 **읽기 전용** (편집/삭제는 Plugins 페이지에서)
3. 중복 시 **명확한 시각적 표시**로 사용자가 정리할 수 있도록 안내

### 리스트 배지 정책

현재 trailing에 `stdio`/`sse` 타입 배지를 표시하지만 리스트에서 불필요한 정보. 타입은 디테일 패널에서 보여주고, trailing은 아래 규칙으로 단순화:

| 서버 종류 | Trailing 배지 |
|----------|--------------|
| 직접 추가 (중복 없음) | 없음 |
| 플러그인 제공 (중복 없음) | `Plugin: {pluginName}` |
| 직접 추가 + 플러그인 중복 | `⚠ duplicate` |
| 플러그인 제공 + 직접 추가 중복 | `Plugin: {name}` + `⚠ duplicate` |

### 스코프 배치

- User scope 플러그인 MCP → User 섹션에 표시
- Project scope 플러그인 MCP → Project 섹션에 표시

---

## 변경 범위

### 1. `shared/types.ts`

```ts
interface McpServer {
  // 기존 필드들...
  fromPlugin?: string      // 이미 존재, 플러그인 이름 채우기
  isDuplicate?: boolean    // 신규: 같은 이름이 다른 소스에도 존재
}
```

### 2. `src/services/mcp-service.ts`

**신규 함수 `getPluginMcpServers()`:**
- `~/.claude/plugins/installed_plugins.json` 읽기
- 활성 플러그인(비활성화되지 않은 것)의 `installPath/.mcp.json` 파싱
- 각 서버에 `fromPlugin: pluginName`, `scope` 설정하여 반환

**`getMcpServers()` 수정:**
- `getPluginMcpServers()` 결과 병합
- 이름 충돌 감지: 직접 추가 서버와 플러그인 서버 중 같은 이름이 있으면 양쪽에 `isDuplicate: true` 설정

### 3. `src/features/mcp-editor/components/McpScopeSection.tsx`

- trailing 배지: 타입 배지 제거 → `fromPlugin` 배지 / `isDuplicate` 배지로 교체

### 4. `src/components/McpDetailPanel.tsx`

- `fromPlugin`이 있는 서버: edit/delete 액션 숨기기
- 대신 "Plugins 페이지에서 관리" 링크 표시
- 타입 정보는 디테일 뷰에서 계속 표시

### 5. 우클릭 컨텍스트 메뉴 (`McpScopeSection`)

- `fromPlugin` 서버: VS Code / Cursor 열기만 표시 (edit/delete 없음)

---

## 비고

- 플러그인 비활성화 상태인 MCP 서버도 표시하되, disabled 아이콘으로 구분
- `installed_plugins.json`의 플러그인 scope(user/project)를 사용해 올바른 섹션에 배치
- 향후 확장: 중복 서버에 "프로젝트 설정 제거" 원클릭 액션 추가 가능

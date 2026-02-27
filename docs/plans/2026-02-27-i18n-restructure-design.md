# i18n 메시지 파일 구조 개선 설계

**날짜:** 2026-02-27
**상태:** 승인됨

## 배경

`messages/en.json` 단일 파일에 257개 키가 flat 구조로 관리되고 있다. feature가 늘수록 파일이 비대해지고, 동일한 텍스트가 feature별로 중복 정의되는 문제가 있다.

## 목표

1. paraglide namespace를 활용해 feature별 메시지 파일 분리
2. 중복 키를 `common_*`으로 추출해 키 수 감소
3. 한번에 전체 마이그레이션 완료

## 파일 구조

### 변경 전

```text
messages/
  en.json   ← 257개 키 flat
  ko.json
```

### 변경 후

```text
messages/
  en/
    common.json    ← scope_*, action_*, detail_*, app_*, nav_* + 신규 common_*
    hooks.json     ← hooks_*, claude_hook_*
    skills.json    ← skills_*
    plugins.json   ← plugin_*
    mcp.json       ← mcp_*
    config.json    ← config_*
    files.json     ← files_*
    settings.json  ← settings_*
    editor.json    ← editor_*
  ko/
    (동일 구조)
```

### inlang settings.json 변경

```json
"plugin.inlang.messageFormat": {
  "pathPattern": "./messages/{locale}/{namespace}.json"
}
```

## common.json 내용

### ① 기존 키 그대로 이동 (키 이름 변경 없음)

| 키 그룹 | 개수 |
|---------|------|
| `scope_*` | 5개 |
| `action_*` | 2개 |
| `detail_*` | 5개 |
| `app_*` | 5개 |
| `nav_*` | 12개 |

### ② 중복 키 통합 (신규 `common_*` 추출)

| 신규 키 | 기존 중복 키 (삭제) | 비고 |
|---------|-------------------|------|
| `common_cancel` | `hooks_cancel`, `plugin_cancel` | |
| `common_docs` | `hooks_docs`, `plugin_docs`, `mcp_docs`, `config_docs`, `files_docs` | |
| `common_open_vscode` | `hooks/skills/plugin/mcp/files_open_vscode` | "VSCode" 오타 통일 |
| `common_open_cursor` | `hooks/skills/plugin/mcp/files_open_cursor` | |
| `common_open_error` | `hooks_open_error`, `mcp_open_error` | |
| `common_no_results` | `hooks_no_results` | 향후 재사용 대비 |

**net 효과:** 약 20개 키 제거, 6개 `common_*` 키 추가

> `render_error`, `render_error_desc`는 feature마다 텍스트가 달라 추출하지 않는다.

## 코드 변경 범위

| 변경 | 영향 파일 |
|------|----------|
| `hooks_cancel` → `common_cancel` | `AddHookDialog.tsx` |
| `plugin_cancel` → `common_cancel` | `PluginActionBar.tsx` |
| `*_docs` → `common_docs` | 각 페이지 헤더 5곳 |
| `*_open_vscode` → `common_open_vscode` | `HookDetailPanel`, `SkillDetailPanel`, `PluginActionBar`, `McpDetailPanel`, `FilesPageContent` |
| `*_open_cursor` → `common_open_cursor` | 동일 5곳 |
| `*_open_error` → `common_open_error` | `HookDetailPanel`, `McpDetailPanel` |
| `hooks_no_results` → `common_no_results` | `PluginList.tsx` 등 1곳 |

총 약 20~25개 `m.*()` 호출 수정.

## 검증 전략

1. `settings.json` pathPattern 변경 후 `pnpm typecheck` — 호환성 즉시 확인
2. 파일 분리 + common 추출 후 `pnpm typecheck` — 누락 키 감지
3. `pnpm build` — paraglide 컴파일 확인
4. 브라우저에서 각 페이지 텍스트 렌더링 확인
5. `ko/` 분리 후 언어 전환 확인

## 주요 리스크

- paraglide v2의 `{namespace}` pathPattern이 기존 `m.hooks_title()` 접근 방식과 호환되는지 → 검증 1단계에서 즉시 확인 가능

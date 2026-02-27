# Dashboard Redesign: Project Overview Grid

**Date**: 2026-02-27
**Status**: Approved

## Problem

현재 대시보드는 숫자 카드(stat cards)만 보여주기 때문에, 프로젝트에 어떤 것들이 설치되어 있고 실행 중인지 파악하려면 각 페이지(Plugins, MCP Servers, Skills...)를 일일이 탐색해야 한다.

추가로, MCP Servers 페이지에서 plugin-provided 서버와 직접 설정한 서버가 섞여 duplicate 경고가 표시되는 등 관계가 불명확하다.

## Goals

1. 한 화면에서 모든 카테고리의 항목을 동시에 확인
2. Plugins 패널에서 각 플러그인이 제공하는 서브 컴포넌트(skills, MCP, hooks) 파악
3. MCP Servers 패널은 직접 설정한 서버만 표시 (plugin-provided 제외 → 중복/badge 노이즈 제거)
4. 상세 정보는 dialog/drawer로 on-demand 표시

## Non-Goals

- 기존 상세 페이지(/plugins, /mcp, /skills 등) 제거 — 편집/추가는 기존 페이지에서 유지
- Files(CLAUDE.md) 섹션 포함 — 별도 페이지로 유지

## Layout

```text
┌──────────────────────┬───────────────────┬──────────────────────┐
│  Plugins             │  MCP Servers      │  Skills              │
│  (tree, expanded)    │  (direct only)    │  (flat list)         │
│                      │                   │                      │
│  ▼ omc               │  ● supabase       │  ● ralph             │
│    ├ Skills (12)     │  ● context7       │  ● commit            │
│    └ MCP: t, team    │  ● github         │  ● review            │
│  ▼ postgres-bp       │  ● shadcn         │  ...                 │
│    ├ Skills (3)      │  ...              │                      │
│    └ MCP: supabase   │                   │                      │
│  ▼ frontend-design   │                   │                      │
│    └ Skills (1)      │                   │                      │
├──────────────┬───────┴──────┬────────────┴──────────────────────┤
│  Hooks       │  Agents      │  LSP Servers                      │
│              │              │                                    │
│  ● PreToolUse│  ● claude    │  ● typescript-lsp                  │
│  ● PostTool  │  ● codex     │                                    │
└──────────────┴──────────────┴────────────────────────────────────┘
```

### Grid 구성

- **상단 row** (flex: 1, 고정 최소 높이 300px): Plugins · MCP Servers · Skills — 3열
- **하단 row** (고정 높이 ~180px): Hooks · Agents · LSP Servers — 3열
- 각 패널은 **고정 높이 + 내부 스크롤** → 전체 페이지 스크롤 없음
- 전체 레이아웃: CSS Grid, `grid-cols-3`

## Panel Specs

### Plugins Panel

- 트리 형태로 플러그인 목록 표시
- 각 플러그인은 기본값 **전체 펼침(expanded)**
- 패널 헤더에 **Collapse All / Expand All** 토글 버튼
- 서브 아이템: Skills, MCP Servers, Hooks, Agents 개수 또는 목록
- 비활성(disabled) 플러그인은 흐린 텍스트 + `disabled` 뱃지
- 클릭 → 플러그인 상세 dialog

### MCP Servers Panel

- **직접 설정한 서버만** 표시 (plugin-provided 필터링)
- `[Plugin: X]` 뱃지, `duplicate` 경고 없음
- 클릭 → MCP 서버 상세 dialog

### Skills / Agents / Hooks / LSP Servers Panels

- flat list
- 클릭 → 상세 dialog/drawer

## Data Layer

- `getPlugins(projectPath)` — 기존 서비스 재사용
- MCP Servers: `getMcpServers(projectPath)` 결과에서 `source === 'plugin'`인 항목 필터링
- `scanPluginComponents(installPath)` — 플러그인 서브 아이템 (기존 enriched plugin data 재사용)

## Component Structure

```text
DashboardPage (/)
  ProjectOverviewGrid
    PluginsPanel
      PluginTreeItem
        PluginSubItems (skills count, mcp list, hooks count)
    McpDirectPanel       ← plugin-provided 제외
    SkillsPanel
    HooksPanel
    AgentsPanel
    LspServersPanel
```

상세 보기:
```text
<ItemDetailDialog> (공통 dialog)
```

## Migration

- 기존 `DashboardPage`의 stat card grid 제거
- `useOverview()` 훅 유지 (패널 헤더의 count 표시에 재사용 가능)
- 기존 상세 페이지(/plugins, /mcp 등)는 그대로 유지

## Out of Scope (Future)

- 패널 순서 커스터마이징
- 패널별 숨기기/보이기 설정

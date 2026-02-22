# Sidebar Group Restructure + Settings Page

## Summary

사이드바를 Global/Project 그룹으로 재구조화하고, 새로운 Settings 페이지를 추가하여
Claude Code의 전체 설정을 GUI로 파악/관리할 수 있게 한다.

## Motivation

- 현재 각 페이지(Files, Plugins, MCP)가 global/project 스코프를 한 페이지에 섞어서 표시
- `settings.json`, `~/.claude.json` 등 핵심 설정 파일이 앱에서 관리되지 않음
- "Claude Manager"로서 전체 설정을 한눈에 파악할 수 있어야 함

## Sidebar Structure

```
[ProjectSwitcher]

Dashboard                        (/)

── Global ──────────────────────
  Settings                       (/global/settings)
  Files                          (/global/files)
  Plugins                        (/global/plugins)
  MCP Servers                    (/global/mcp)

── Project ─────────────────────  (프로젝트 선택 시만 표시)
  Settings                       (/project/settings)
  Files                          (/project/files)
  Plugins                        (/project/plugins)
  MCP Servers                    (/project/mcp)
```

## Routing

| Route | Description |
|-------|-------------|
| `/` | Dashboard (전체 요약) |
| `/global/settings` | Global settings (settings.json + ~/.claude.json) |
| `/global/files` | Global files (CLAUDE.md, commands/, skills/, agents/) |
| `/global/plugins` | User-level plugins |
| `/global/mcp` | Global MCP servers |
| `/project/settings` | Project settings (settings.json + settings.local.json) |
| `/project/files` | Project files (.claude/CLAUDE.md, commands/, skills/, agents/) |
| `/project/plugins` | Project-level plugins |
| `/project/mcp` | Project MCP servers |
| `/global/plugins/$id` | Plugin detail (global) |
| `/project/plugins/$id` | Plugin detail (project) |
| `/global/mcp/$name` | MCP server detail (global) |
| `/project/mcp/$name` | MCP server detail (project) |

## Settings Page

### Global Settings (`/global/settings`)

**settings.json (Editable)**

| Card | Fields | UI |
|------|--------|----|
| General | model | Select (opus/sonnet/haiku) |
| | alwaysThinkingEnabled | Toggle |
| | skipDangerousModePermissionPrompt | Toggle |
| | enableAllProjectMcpServers | Toggle |
| Environment | env key-value pairs | Key-value input list |
| Status Line | statusLine.type, statusLine.command | Select + Input |

> `enabledPlugins` is managed by Plugins page, excluded here to avoid duplication.

**~/.claude.json (Read-only)**

| Card | Fields |
|------|--------|
| Install Info | installMethod, numStartups, autoUpdates |
| Feature Flags | cachedStatsigGates as on/off badges (Collapsible) |

> tipsHistory, cachedDynamicConfigs excluded (internal noise).

### Project Settings (`/project/settings`)

**settings.json (Editable)**

| Card | Fields | UI |
|------|--------|----|
| Shared Settings | Any overrides (enabledPlugins, etc.) | Dynamic key-value or specific forms |

**settings.local.json (Editable)**

| Card | Fields | UI |
|------|--------|----|
| Permissions | allow/deny rules | List with add/remove |

## Existing Page Changes

- Files, Plugins, MCP: Reuse existing page components with `scope` prop
- Each page shows only one scope (sidebar determines scope)
- Remove in-page Global/Project section separation logic

## Breadcrumb

```
Dashboard
Global > Settings
Global > Files
Global > Plugins > plugin-name
Project > Settings
Project > Files
Project > MCP Servers > server-name
```

## Data Layer

- ConfigService: Add `readSettingsJson(scope)`, `readClaudeJson()`
- FileWriter: Add `writeSettingsJson(scope, data)`
- Server Functions: `getSettingsFn`, `saveSettingsFn`, `getClaudeJsonFn`
- React Query: Polling for external change detection (existing pattern)

## Scope

- v1: Global + Project settings
- settings.local.json: Project only
- ~/.claude.json: Global only (read-only)

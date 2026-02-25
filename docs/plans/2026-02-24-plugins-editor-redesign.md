# Plugins Editor Redesign

Date: 2026-02-24

## Overview

Plugins 페이지를 Claude Desktop의 플러그인 UI와 동일한 구조로 재설계한다. 기존 그리드 카드 레이아웃에서 3패널 구조로 전환하며, hooks/skills 에디터의 UI 패턴을 따르되 플러그인 특성에 맞게 확장한다. 마켓플레이스 탐색 기능도 내장한다.

## Data Model

### Plugin 타입 확장

```typescript
interface Plugin {
  // installed_plugins.json 기반 (기존)
  id: string                    // "name@marketplace"
  name: string
  marketplace: string
  scope: "user" | "project" | "local" | "managed"
  version: string
  installedAt: string
  lastUpdated: string
  gitCommitSha: string
  installPath: string
  enabled: boolean
  projectPath?: string

  // plugin.json manifest 메타데이터 (신규)
  description?: string
  author?: PluginAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]

  // installPath 스캔 결과 (신규)
  contents?: PluginContents
}

interface PluginAuthor {
  name: string
  email?: string
  url?: string
}

interface PluginContents {
  commands: AgentFile[]      // commands/*.md (legacy)
  skills: AgentFile[]        // skills/*/SKILL.md
  agents: AgentFile[]        // agents/*.md
  hooks: HooksSettings       // hooks/hooks.json
  mcpServers: McpServer[]    // .mcp.json
  lspServers: LspServer[]    // .lsp.json
  outputStyles: AgentFile[]  // outputStyles/
}

interface LspServer {
  name: string
  command: string
  args?: string[]
  transport?: "stdio" | "socket"
  extensionToLanguage: Record<string, string>
}
```

### Marketplace 타입 (신규)

```typescript
interface Marketplace {
  name: string
  owner: { name: string; email?: string }
  metadata?: {
    description?: string
    version?: string
    pluginRoot?: string
  }
  plugins: MarketplacePluginEntry[]
  autoUpdate?: boolean
  source?: MarketplaceSource
}

type PluginSource =
  | string
  | { source: "github"; repo: string; ref?: string; sha?: string }
  | { source: "url"; url: string; ref?: string; sha?: string }
  | { source: "npm"; package: string; version?: string; registry?: string }
  | { source: "pip"; package: string; version?: string; registry?: string }

type MarketplaceSource =
  | { source: "github"; repo: string; ref?: string }
  | { source: "url"; url: string }
  | { source: "local"; path: string }

interface MarketplacePluginEntry {
  name: string
  source: PluginSource
  description?: string
  version?: string
  author?: PluginAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  category?: string
  tags?: string[]
  strict?: boolean
  commands?: string | string[]
  agents?: string | string[]
  skills?: string | string[]
  hooks?: string | string[] | HooksSettings
  mcpServers?: string | string[] | Record<string, unknown>
  lspServers?: string | string[] | Record<string, unknown>
  outputStyles?: string | string[]
  installed?: boolean  // UI-only
}
```

## UI Layout

### 3 States

**State 1 — Plugin selected (2-panel):**
- Panel 1 (280px): Plugin list grouped by marketplace, selected plugin expands to show sub-categories
- Panel 2 (flex-1): Plugin detail — header (name + update btn + enable/disable toggle + more menu), source, description, component sections (commands, skills, agents, hooks, etc.) with badge chips

**State 2 — Sub-category selected (3-panel):**
- Panel 1 (220px): Plugin list (narrower)
- Panel 2 (260px): Item list for selected category
- Panel 3 (flex-1): Item detail (same as skills/hooks right panel — metadata + content viewer with preview/code toggle)

**State 3 — Nothing selected (2-panel empty):**
- Panel 1 (280px): Plugin list
- Panel 2 (flex-1): Empty state

### Panel 1 — Plugin List

- Tab switcher: [설치됨] [탐색]
- Search input
- Scope sections grouped by marketplace name (not user/project)
- Plugin items: icon + name + (marketplace name in parentheses)
- Selected plugin expands collapse to show sub-categories:
  - SquareTerminal — 명령 (Commands)
  - ScrollText — 스킬 (Skills)
  - Workflow — 에이전트 (Agents)
  - Zap — 훅 (Hooks)
  - Server — MCP Servers
  - Code — LSP Servers
  - Palette — Output Styles

### Panel 2 — Plugin Detail (State 1)

Claude Desktop style:
- Header: plugin name + [업데이트] button + enable/disable toggle + ··· dropdown (edit, uninstall)
- Sections: 소스, 설명, 명령(N), 스킬(N), 에이전트(N), 훅(N) — each with badge chips
- "N개 더 보기" for truncated lists

### Panel 2 — Item List (State 2)

- Category header (e.g., "스킬")
- Selectable item list

### Panel 3 — Item Detail (State 2)

- Same structure as skills/hooks detail panel
- Header: item name + [편집] + ··· menu
- Metadata + content viewer (preview/code/copy toggle)

### Marketplace Browse Tab

- Panel 1 "탐색" tab: marketplace plugins grouped by marketplace name
- Panel 2: marketplace plugin detail (description, author, category, keywords, version)
- Install dropdown: User scope / Project scope / Local scope
- Bottom of Panel 1: "⚙️ 마켓플레이스 관리" link → MarketplaceDialog

### MarketplaceDialog

- List of configured marketplaces with auto-update toggles and remove buttons
- Add marketplace input + button

## Component Architecture

```text
src/features/plugins-editor/
├── components/
│   ├── PluginsPageContent.tsx      ← Main (3-panel state management)
│   ├── PluginsScopeSection.tsx     ← Panel 1: marketplace group + plugin list
│   ├── PluginTreeItem.tsx          ← Panel 1: individual plugin (expand/collapse sub-categories)
│   ├── PluginDetailPanel.tsx       ← Panel 2 State 1: plugin detail
│   ├── PluginContentList.tsx       ← Panel 2 State 2: sub-item list
│   ├── PluginContentDetail.tsx     ← Panel 3: sub-item detail
│   ├── PluginActionBar.tsx         ← Header actions (update, toggle, more menu)
│   └── MarketplaceDialog.tsx       ← Marketplace management dialog
├── api/
│   ├── plugins.functions.ts        ← Server Functions
│   └── plugins.queries.ts          ← React Query hooks
├── constants.ts                    ← Category meta (icons, labels), schemas
└── types.ts                        ← Plugin extended types
```

### State Management

```typescript
const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
const [selectedCategory, setSelectedCategory] = useState<PluginCategory | null>(null)
const [selectedItem, setSelectedItem] = useState<AgentFile | null>(null)
const [activeTab, setActiveTab] = useState<"installed" | "discover">("installed")
```

### Routing

- `/plugins` — single route (PluginsPageContent)
- `/global/plugins`, `/project/plugins` → redirect to `/plugins`
- Remove `/global/plugins/$id`, `/project/plugins/$id` detail routes

### Server Functions

```typescript
// Existing (extended)
getPluginsFn()                    → Plugin[] (with metadata + contents)
togglePluginFn({ id, enable })    → enable/disable

// New
getPluginContentsFn({ installPath })  → PluginContents
installPluginFn({ name, marketplace, scope })
uninstallPluginFn({ id, scope })
updatePluginFn({ id })

// Marketplace
getMarketplacesFn()                        → Marketplace[]
addMarketplaceFn({ source })
removeMarketplaceFn({ name })
updateMarketplaceFn({ name })
getMarketplacePluginsFn()                  → MarketplacePluginEntry[]
```

## Implementation Order

| # | Task | Description |
|---|------|-------------|
| 1 | Types & constants | types.ts, constants.ts, shared/types.ts extension |
| 2 | Server side | config-service extension, claude-cli commands, Server Functions |
| 3 | React Query | plugins.queries.ts — queries + mutations |
| 4 | Panel 1 | PluginsScopeSection, PluginTreeItem, tab switching |
| 5 | Panel 2 (detail) | PluginDetailPanel, PluginActionBar |
| 6 | Panel 2 (list) + Panel 3 | PluginContentList, PluginContentDetail |
| 7 | Marketplace | Browse tab, MarketplaceDialog |
| 8 | Routing | Single route, redirect existing routes |
| 9 | Cleanup | Remove old components, lint/typecheck/test pass |

## References

- Claude Desktop plugin UI (screenshots)
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/discover-plugins

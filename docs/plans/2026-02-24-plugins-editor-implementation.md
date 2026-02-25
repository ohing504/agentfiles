# Plugins Editor Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Plugins 페이지를 Claude Desktop과 동일한 3패널 구조로 재설계하고, 마켓플레이스 탐색 기능을 내장한다.

**Architecture:** `src/features/plugins-editor/`에 feature colocation 패턴으로 구성. 1패널(플러그인 목록) + 2패널(상세 또는 아이템 리스트) + 3패널(아이템 상세). Server Functions로 CLI 위임 + installPath 파일시스템 스캔.

**Tech Stack:** TanStack Start (Server Functions), React 19, TanStack Query, shadcn/ui, Tailwind CSS v4, Zod, Lucide React

**Design doc:** `docs/plans/2026-02-24-plugins-editor-redesign.md`

---

## Task 1: Types & Constants

**Files:**
- Create: `src/features/plugins-editor/types.ts`
- Create: `src/features/plugins-editor/constants.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/lib/query-keys.ts`

### Step 1: Extend shared types

Add to `src/shared/types.ts` — new types after existing `Plugin` interface:

```typescript
// Plugin scope 확장 (기존 "user" | "project" → 4종)
// 기존 Plugin.scope 타입을 아래로 변경
export type PluginScope = "user" | "project" | "local" | "managed"

export interface PluginAuthor {
  name: string
  email?: string
  url?: string
}

export interface LspServer {
  name: string
  command: string
  args?: string[]
  transport?: "stdio" | "socket"
  extensionToLanguage: Record<string, string>
}

export interface PluginContents {
  commands: AgentFile[]
  skills: AgentFile[]
  agents: AgentFile[]
  hooks: HooksSettings
  mcpServers: McpServer[]
  lspServers: LspServer[]
  outputStyles: AgentFile[]
}
```

Update existing `Plugin` interface:
- Change `scope: "user" | "project"` → `scope: PluginScope`
- Add new fields: `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `contents`

### Step 2: Create feature types

Create `src/features/plugins-editor/types.ts`:

```typescript
import type { HooksSettings, McpServer } from "@/shared/types"

// Marketplace types (marketplace.json 스키마)
export type PluginSource =
  | string
  | { source: "github"; repo: string; ref?: string; sha?: string }
  | { source: "url"; url: string; ref?: string; sha?: string }
  | { source: "npm"; package: string; version?: string; registry?: string }
  | { source: "pip"; package: string; version?: string; registry?: string }

export type MarketplaceSource =
  | { source: "github"; repo: string; ref?: string }
  | { source: "url"; url: string }
  | { source: "local"; path: string }

export interface MarketplacePluginEntry {
  name: string
  source: PluginSource
  description?: string
  version?: string
  author?: import("@/shared/types").PluginAuthor
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
  installed?: boolean
}

export interface Marketplace {
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

// UI state types
export type PluginCategory =
  | "commands"
  | "skills"
  | "agents"
  | "hooks"
  | "mcpServers"
  | "lspServers"
  | "outputStyles"

export type PluginTab = "installed" | "discover"
```

### Step 3: Create constants

Create `src/features/plugins-editor/constants.ts`:

```typescript
import {
  Code,
  Palette,
  ScrollText,
  Server,
  SquareTerminal,
  Workflow,
  Zap,
} from "lucide-react"
import type { PluginCategory } from "./types"

export const PLUGIN_CATEGORY_META: Record<
  PluginCategory,
  { icon: typeof SquareTerminal; label: string; labelKo: string }
> = {
  commands: { icon: SquareTerminal, label: "Commands", labelKo: "명령" },
  skills: { icon: ScrollText, label: "Skills", labelKo: "스킬" },
  agents: { icon: Workflow, label: "Agents", labelKo: "에이전트" },
  hooks: { icon: Zap, label: "Hooks", labelKo: "훅" },
  mcpServers: { icon: Server, label: "MCP Servers", labelKo: "MCP 서버" },
  lspServers: { icon: Code, label: "LSP Servers", labelKo: "LSP 서버" },
  outputStyles: { icon: Palette, label: "Output Styles", labelKo: "출력 스타일" },
}

/** 표시 순서 */
export const PLUGIN_CATEGORY_ORDER: PluginCategory[] = [
  "commands",
  "skills",
  "agents",
  "hooks",
  "mcpServers",
  "lspServers",
  "outputStyles",
]

/** 비어있지 않은 카테고리만 필터 */
export function getNonEmptyCategories(
  contents: import("@/shared/types").PluginContents | undefined,
): PluginCategory[] {
  if (!contents) return []
  return PLUGIN_CATEGORY_ORDER.filter((cat) => {
    const items = contents[cat]
    if (Array.isArray(items)) return items.length > 0
    if (typeof items === "object") return Object.keys(items).length > 0
    return false
  })
}
```

### Step 4: Extend query keys

Add to `src/lib/query-keys.ts`:

```typescript
plugins: {
  all: ["plugins"] as const,
  contents: (installPath: string) =>
    [...queryKeys.plugins.all, "contents", installPath] as const,
},

marketplaces: {
  all: ["marketplaces"] as const,
  plugins: () => [...queryKeys.marketplaces.all, "plugins"] as const,
},
```

### Step 5: Commit

```text
feat(plugins): add plugin types, constants, and query keys
```

---

## Task 2: Server Side — Plugin Metadata & Contents Scanning

**Files:**
- Modify: `src/services/config-service.ts`
- Create: `tests/services/plugin-contents.test.ts`

### Step 1: Write tests for plugin contents scanning

Create `tests/services/plugin-contents.test.ts` with test cases:

1. `scanPluginContents()` — reads commands/*.md
2. `scanPluginContents()` — reads skills/*/SKILL.md
3. `scanPluginContents()` — reads agents/*.md
4. `scanPluginContents()` — reads hooks/hooks.json
5. `scanPluginContents()` — reads .mcp.json
6. `scanPluginContents()` — reads .lsp.json
7. `scanPluginContents()` — returns empty when installPath missing
8. `readPluginManifest()` — reads .claude-plugin/plugin.json
9. `readPluginManifest()` — returns null when no manifest

Use existing test helpers pattern (createTmpDir, writeFile, writeJson).

### Step 2: Run tests to verify they fail

```bash
pnpm test tests/services/plugin-contents.test.ts
```

### Step 3: Implement scanPluginContents and readPluginManifest

Add to `src/services/config-service.ts`:

```typescript
export async function readPluginManifest(
  installPath: string,
): Promise<{
  description?: string
  author?: PluginAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
} | null> {
  const manifestPath = path.join(installPath, ".claude-plugin", "plugin.json")
  try {
    const content = await fs.readFile(manifestPath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function scanPluginContents(
  installPath: string,
): Promise<PluginContents> {
  const [commands, skills, agents, hooks, mcpServers, lspServers, outputStyles] =
    await Promise.all([
      scanMdDir(path.join(installPath, "commands"), "command").catch(() => []),
      scanSkillsDir(path.join(installPath, "skills")).catch(() => []),
      scanMdDir(path.join(installPath, "agents"), "agent").catch(() => []),
      readHooksJson(path.join(installPath, "hooks", "hooks.json")),
      readMcpJson(path.join(installPath, ".mcp.json")),
      readLspJson(path.join(installPath, ".lsp.json")),
      scanMdDir(path.join(installPath, "outputStyles"), "skill").catch(() => []),
    ])
  return { commands, skills, agents, hooks, mcpServers, lspServers, outputStyles }
}
```

Helper functions `readHooksJson`, `readMcpJson`, `readLspJson` — read and parse JSON files with graceful error handling.

### Step 4: Extend getPlugins() to include metadata + contents

Modify existing `getPlugins()` in `config-service.ts`:
- After building plugins array, for each plugin call `readPluginManifest(plugin.installPath)` and merge metadata fields
- Call `scanPluginContents(plugin.installPath)` and attach as `plugin.contents`
- Use `Promise.all` for parallel reads

### Step 5: Run tests to verify they pass

```bash
pnpm test tests/services/plugin-contents.test.ts
```

### Step 6: Commit

```text
feat(plugins): add plugin manifest reading and contents scanning
```

---

## Task 3: Server Side — CLI Commands

**Files:**
- Modify: `src/services/claude-cli.ts`
- Modify: `tests/services/claude-cli.test.ts`

### Step 1: Add new CLI wrapper functions

Add to `src/services/claude-cli.ts`:

```typescript
export async function pluginInstall(
  name: string,
  scope: PluginScope = "user",
): Promise<void> {
  await execClaude(["plugin", "install", name, "-s", scope])
}

export async function pluginUninstall(
  name: string,
  scope: PluginScope = "user",
): Promise<void> {
  await execClaude(["plugin", "uninstall", name, "-s", scope])
}

export async function pluginUpdate(name: string): Promise<void> {
  await execClaude(["plugin", "update", name])
}

// Marketplace
export async function marketplaceAdd(source: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "add", source])
}

export async function marketplaceRemove(name: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "remove", name])
}

export async function marketplaceUpdate(name: string): Promise<void> {
  await execClaude(["plugin", "marketplace", "update", name])
}
```

Also update existing `pluginToggle` to accept scope parameter:

```typescript
export async function pluginToggle(
  id: string,
  enable: boolean,
  scope: PluginScope = "user",
): Promise<void> {
  const action = enable ? "enable" : "disable"
  await execClaude(["plugin", action, id, "-s", scope])
}
```

### Step 2: Commit

```bash
feat(plugins): add CLI wrappers for install, uninstall, update, marketplace
```

---

## Task 4: Server Functions

**Files:**
- Create: `src/features/plugins-editor/api/plugins.functions.ts`
- Modify: `src/server/plugins.ts` (기존 파일 유지 — 점진적 마이그레이션)

### Step 1: Create plugins.functions.ts

```typescript
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const pluginScopeSchema = z.enum(["user", "project", "local", "managed"])

export const getPluginsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPlugins } = await import("@/services/config-service")
    return getPlugins()
  },
)

export const getPluginContentsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ installPath: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { scanPluginContents } = await import("@/services/config-service")
    return scanPluginContents(data.installPath)
  })

export const togglePluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      enable: z.boolean(),
      scope: pluginScopeSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { pluginToggle } = await import("@/services/claude-cli")
    await pluginToggle(data.id, data.enable, data.scope)
    return { success: true }
  })

export const installPluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      scope: pluginScopeSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { pluginInstall } = await import("@/services/claude-cli")
    await pluginInstall(data.name, data.scope)
    return { success: true }
  })

export const uninstallPluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      scope: pluginScopeSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { pluginUninstall } = await import("@/services/claude-cli")
    await pluginUninstall(data.id, data.scope)
    return { success: true }
  })

export const updatePluginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { pluginUpdate } = await import("@/services/claude-cli")
    await pluginUpdate(data.id)
    return { success: true }
  })

// Marketplace
export const getMarketplacesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getMarketplaces } = await import("@/services/config-service")
    return getMarketplaces()
  },
)

export const addMarketplaceFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ source: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { marketplaceAdd } = await import("@/services/claude-cli")
    await marketplaceAdd(data.source)
    return { success: true }
  })

export const removeMarketplaceFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { marketplaceRemove } = await import("@/services/claude-cli")
    await marketplaceRemove(data.name)
    return { success: true }
  })
```

### Step 2: Add getMarketplaces() to config-service

Read marketplace data from `~/.claude/plugins/` cache directory by scanning marketplace.json files.

### Step 3: Run typecheck

```bash
pnpm typecheck
```

### Step 4: Commit

```bash
feat(plugins): add server functions for plugin and marketplace CRUD
```

---

## Task 5: React Query Hooks

**Files:**
- Create: `src/features/plugins-editor/api/plugins.queries.ts`

### Step 1: Create plugins.queries.ts

Follow `hooks.queries.ts` pattern exactly:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import type { PluginScope } from "@/shared/types"

const FREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

export function usePluginsQuery() {
  return useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: async () => {
      const { getPluginsFn } = await import("./plugins.functions")
      return getPluginsFn()
    },
    ...FREQUENT_REFETCH,
  })
}

export function usePluginMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
  }

  const toggleMutation = useMutation({
    mutationFn: async (params: { id: string; enable: boolean; scope?: PluginScope }) => {
      const { togglePluginFn } = await import("./plugins.functions")
      return togglePluginFn({ data: params })
    },
    onSuccess: invalidate,
  })

  const installMutation = useMutation({
    mutationFn: async (params: { name: string; scope?: PluginScope }) => {
      const { installPluginFn } = await import("./plugins.functions")
      return installPluginFn({ data: params })
    },
    onSuccess: invalidate,
  })

  const uninstallMutation = useMutation({
    mutationFn: async (params: { id: string; scope?: PluginScope }) => {
      const { uninstallPluginFn } = await import("./plugins.functions")
      return uninstallPluginFn({ data: params })
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const { updatePluginFn } = await import("./plugins.functions")
      return updatePluginFn({ data: params })
    },
    onSuccess: invalidate,
  })

  return { toggleMutation, installMutation, uninstallMutation, updateMutation }
}

export function useMarketplacesQuery() {
  return useQuery({
    queryKey: queryKeys.marketplaces.all,
    queryFn: async () => {
      const { getMarketplacesFn } = await import("./plugins.functions")
      return getMarketplacesFn()
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })
}

export function useMarketplaceMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.marketplaces.all })
  }

  const addMutation = useMutation({
    mutationFn: async (params: { source: string }) => {
      const { addMarketplaceFn } = await import("./plugins.functions")
      return addMarketplaceFn({ data: params })
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async (params: { name: string }) => {
      const { removeMarketplaceFn } = await import("./plugins.functions")
      return removeMarketplaceFn({ data: params })
    },
    onSuccess: invalidate,
  })

  return { addMutation, removeMutation }
}
```

### Step 2: Run typecheck

```bash
pnpm typecheck
```

### Step 3: Commit

```bash
feat(plugins): add React Query hooks for plugins and marketplaces
```

---

## Task 6: Panel 1 — Plugin List

**Files:**
- Create: `src/features/plugins-editor/components/PluginsPageContent.tsx`
- Create: `src/features/plugins-editor/components/PluginsScopeSection.tsx`
- Create: `src/features/plugins-editor/components/PluginTreeItem.tsx`

### Step 1: PluginTreeItem

Individual plugin in the list. Shows:
- Puzzle icon + plugin name
- When selected: expand collapse to show sub-categories
- Sub-categories: icon + label from `PLUGIN_CATEGORY_META`, only show non-empty ones

Props: `plugin`, `isSelected`, `selectedCategory`, `onSelect`, `onSelectCategory`

### Step 2: PluginsScopeSection

Groups plugins by marketplace name. Shows:
- Marketplace name as header (with ℹ️ or ＋ button)
- List of PluginTreeItem

Props: `label`, `plugins`, `selectedPlugin`, `selectedCategory`, `onSelectPlugin`, `onSelectCategory`

### Step 3: PluginsPageContent (shell)

Main component with state management:
- Tab switcher: [설치됨] [탐색]
- Search input
- Left panel with PluginsScopeSection per marketplace group
- Right panel placeholder (Empty state for now)

State: `selectedPlugin`, `selectedCategory`, `selectedItem`, `activeTab`, `searchQuery`

### Step 4: Run dev server to verify visually

```bash
PORT=3001 pnpm dev
```

### Step 5: Commit

```text
feat(plugins): add Panel 1 - plugin list with scope sections and tree items
```

---

## Task 7: Panel 2 — Plugin Detail

**Files:**
- Create: `src/features/plugins-editor/components/PluginDetailPanel.tsx`
- Create: `src/features/plugins-editor/components/PluginActionBar.tsx`

### Step 1: PluginActionBar

Header bar with:
- Plugin name (h2)
- [업데이트] button → `updateMutation`
- Enable/Disable toggle switch
- ··· DropdownMenu → Edit (open in editor), Uninstall (AlertDialog confirm)

Props: `plugin`, `toggleMutation`, `updateMutation`, `uninstallMutation`, `cliAvailable`

### Step 2: PluginDetailPanel

Claude Desktop style detail view:
- PluginActionBar at top
- Sections using `<div>` structure (not Card):
  - **소스**: `마켓플레이스 (name)` — link to marketplace if homepage exists
  - **설명**: `plugin.description` text
  - **명령 N**: description + Badge chips for each command name
  - **스킬 N**: description + Badge chips, "N개 더 보기" truncation
  - **에이전트 N**: description + Badge chips
  - **훅 N ···**: description + Badge chips
  - (same for mcpServers, lspServers, outputStyles if non-empty)

Use `PLUGIN_CATEGORY_META` for icons/labels. Show count next to category name.

### Step 3: Wire into PluginsPageContent

When `selectedPlugin && !selectedCategory`:
- Panel 2 shows `<PluginDetailPanel>`

### Step 4: Visual verification

```bash
PORT=3001 pnpm dev
```

### Step 5: Commit

```text
feat(plugins): add Panel 2 - plugin detail with action bar and component sections
```

---

## Task 8: Panel 2 (List) + Panel 3 (Detail) — Sub-item View

**Files:**
- Create: `src/features/plugins-editor/components/PluginContentList.tsx`
- Create: `src/features/plugins-editor/components/PluginContentDetail.tsx`

### Step 1: PluginContentList

Middle panel showing items for selected category:
- Category name as header (from PLUGIN_CATEGORY_META)
- Scrollable list of items
- Selected item highlighted
- For hooks: show event name + matcher as item label
- For commands/skills/agents: show file name
- For mcpServers: show server name
- For lspServers: show server name

Props: `plugin`, `category`, `selectedItem`, `onSelectItem`

### Step 2: PluginContentDetail

Right panel showing selected item detail:
- Reuse patterns from existing `SkillDetailPanel` / `HookDetailPanel`:
  - Header: item name + [편집] + ··· menu
  - Metadata section (scope badge, last modified, etc.)
  - Content viewer with Shiki syntax highlighting
  - Preview/Code/Copy toggle buttons (like Claude Desktop screenshot)
- For AgentFile items (commands, skills, agents, outputStyles): show frontmatter + markdown content
- For hooks: show hook JSON configuration
- For mcpServers: show server config JSON
- For lspServers: show server config JSON

Props: `plugin`, `category`, `item`

### Step 3: Update PluginsPageContent for 3-panel layout

When `selectedPlugin && selectedCategory`:
- Panel 1 narrows to 220px
- Panel 2 (260px) shows `<PluginContentList>`
- Panel 3 (flex-1) shows `<PluginContentDetail>` or Empty state

Layout logic:
```typescript
const is3Panel = selectedPlugin != null && selectedCategory != null
const panel1Width = is3Panel ? "w-[220px]" : "w-[280px]"
```

### Step 4: Visual verification

### Step 5: Commit

```bash
feat(plugins): add Panel 2 list + Panel 3 detail for sub-item view
```

---

## Task 9: Marketplace — Browse Tab

**Files:**
- Modify: `src/features/plugins-editor/components/PluginsPageContent.tsx`
- Create: `src/features/plugins-editor/components/MarketplaceDialog.tsx`

### Step 1: Browse tab in Panel 1

When `activeTab === "discover"`:
- Panel 1 shows marketplace plugins grouped by marketplace name
- Each item shows: plugin name, description snippet
- Installed plugins show checkmark badge
- Bottom: "⚙️ 마켓플레이스 관리" button

### Step 2: Browse detail in Panel 2

When a marketplace plugin is selected in browse mode:
- Show plugin entry detail: name, description, author, category, keywords (Badge chips), version
- [설치 ▼] dropdown button with scope options (User / Project / Local)
- After install: `installMutation.mutate({ name: "pluginName@marketplace" })`

### Step 3: MarketplaceDialog

Dialog for managing marketplaces:
- List of configured marketplaces with:
  - Name + source info
  - Auto-update toggle
  - Remove button (AlertDialog confirm)
- Add marketplace input + button at bottom

Props: `open`, `onOpenChange`

### Step 4: Visual verification

### Step 5: Commit

```text
feat(plugins): add marketplace browse tab and management dialog
```

---

## Task 10: Routing & Sidebar

**Files:**
- Create: `src/routes/plugins/route.tsx` (new, replaces index.tsx)
- Modify: `src/routes/plugins/index.tsx` (remove or repurpose)
- Modify: `src/routes/global/plugins/index.tsx` → redirect to /plugins
- Modify: `src/routes/project/plugins/index.tsx` → redirect to /plugins
- Modify: `src/routes/global/plugins/$id/route.tsx` → redirect to /plugins
- Modify: `src/routes/project/plugins/$id/route.tsx` → redirect to /plugins
- Modify: `src/components/layout/Sidebar.tsx`

### Step 1: Create new /plugins route

Create `src/routes/plugins/route.tsx`:
```typescript
import { createFileRoute } from "@tanstack/react-router"
import { PluginsPageContent } from "@/features/plugins-editor/components/PluginsPageContent"

export const Route = createFileRoute("/plugins")({
  component: PluginsPageContent,
})
```

### Step 2: Update redirects

Change `src/routes/plugins/index.tsx`:
- Remove the redirect to `/global/plugins`
- This file may need to be removed if route.tsx handles it

Change `src/routes/global/plugins/index.tsx`:
```typescript
import { createFileRoute, redirect } from "@tanstack/react-router"
export const Route = createFileRoute("/global/plugins/")({
  beforeLoad: () => { throw redirect({ to: "/plugins" }) },
  component: () => null,
})
```

Same for `/project/plugins/index.tsx`, `/global/plugins/$id/route.tsx`, `/project/plugins/$id/route.tsx`.

### Step 3: Update Sidebar

In `src/components/layout/Sidebar.tsx`:
- Add Plugins to the top-level nav group (alongside Dashboard, Skills, Hooks):
```typescript
<SidebarMenuItem>
  <SidebarMenuButton asChild tooltip={m.nav_plugins()}>
    <Link to="/plugins" activeProps={{ "data-active": true }}>
      <Puzzle />
      <span>{m.nav_plugins()}</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```
- Remove Plugins from `globalNavItems` and `projectNavItems` arrays

### Step 4: Verify navigation works

### Step 5: Commit

```sql
feat(plugins): add /plugins route and update sidebar navigation
```

---

## Task 11: Cleanup & Quality Checks

**Files:**
- Delete: `src/components/pages/PluginsPageContent.tsx`
- Delete: `src/components/pages/PluginDetailContent.tsx`
- Modify: any files importing deleted components

### Step 1: Remove old components

Delete the old plugin page components. Search for any remaining imports.

### Step 2: Remove old use-config.ts plugin hooks

The old `usePlugins()` in `src/hooks/use-config.ts` can be removed (or kept for backward compat if other pages use it). Check Dashboard for usage.

### Step 3: Run lint

```bash
pnpm lint
```

Fix any issues.

### Step 4: Run typecheck

```bash
pnpm typecheck
```

Fix any type errors.

### Step 5: Run tests

```bash
pnpm test
```

Fix any broken tests.

### Step 6: Run build

```bash
pnpm build
```

Verify production build succeeds.

### Step 7: Commit

```text
refactor(plugins): remove old plugin components and clean up imports
```

---

## Summary

| Task | Description | Est. Complexity |
|------|-------------|----------------|
| 1 | Types & Constants | Small |
| 2 | Server — Plugin Scanning | Medium |
| 3 | Server — CLI Commands | Small |
| 4 | Server Functions | Medium |
| 5 | React Query Hooks | Small |
| 6 | Panel 1 — Plugin List | Medium |
| 7 | Panel 2 — Plugin Detail | Medium |
| 8 | Panel 2+3 — Sub-item View | Large |
| 9 | Marketplace — Browse Tab | Large |
| 10 | Routing & Sidebar | Small |
| 11 | Cleanup & Quality | Small |

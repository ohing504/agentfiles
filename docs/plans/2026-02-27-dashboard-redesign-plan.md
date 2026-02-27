# Dashboard Redesign: Project Overview Grid — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace stat-card grid on Dashboard (`/`) with a multi-panel overview grid showing live item lists per category.

**Architecture:** New `src/features/dashboard/` feature module. Each panel is a standalone React component consuming existing React Query hooks. Top row (Plugins tree, MCP direct-only, Skills) + bottom row (Hooks, Agents, LSP Servers). Item detail via dialog/drawer on demand.

**Tech Stack:** React 19, TanStack Query, shadcn/ui, Tailwind CSS v4, TanStack Router

---

## Key Data Hooks (all already exist)

| Panel | Hook | Notes |
|---|---|---|
| Plugins | `usePluginsQuery(projectPath)` from `plugins.queries.ts` | returns `Plugin[]` with enriched `contents` |
| MCP | `useMcpQuery()` from `mcp.queries.ts` | filter `!s.fromPlugin` client-side |
| Skills | `useAgentFiles("skill")` from `use-config.ts` | |
| Agents | `useAgentFiles("agent")` from `use-config.ts` | |
| Hooks | `useHooksQuery("global")` + `useHooksQuery("project")` | returns `HooksSettings = Partial<Record<HookEventName, HookMatcherGroup[]>>` |
| LSP | derived from `plugins.flatMap(p => p.contents?.lspServers ?? [])` | no extra query needed |

---

## Task 1: OverviewPanel shared shell

**Files:**
- Create: `src/features/dashboard/components/OverviewPanel.tsx`

**Step 1: Write the component**

```tsx
// src/features/dashboard/components/OverviewPanel.tsx
import type { ReactNode } from "react"

interface OverviewPanelProps {
  title: string
  count?: number
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function OverviewPanel({
  title,
  count,
  actions,
  children,
  className,
}: OverviewPanelProps) {
  return (
    <div
      className={`flex flex-col border border-border rounded-lg overflow-hidden min-h-0 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-[10px] text-muted-foreground">({count})</span>
          )}
        </div>
        {actions}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-1">{children}</div>
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors

---

## Task 2: PluginsPanel (tree with expand/collapse)

**Files:**
- Create: `src/features/dashboard/components/PluginsPanel.tsx`

**Step 1: Write the component**

```tsx
// src/features/dashboard/components/PluginsPanel.tsx
import { ChevronDown, ChevronRight, Plug2Icon, Server, ScrollText, Zap } from "lucide-react"
import { useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import { titleCase } from "@/lib/format"
import type { Plugin } from "@/shared/types"
import { OverviewPanel } from "./OverviewPanel"

export function PluginsPanel() {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const allCollapsed = plugins.length > 0 && plugins.every((p) => collapsed.has(p.id))

  function toggleAll() {
    setCollapsed(
      allCollapsed ? new Set() : new Set(plugins.map((p) => p.id)),
    )
  }

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const actions = (
    <button
      type="button"
      onClick={toggleAll}
      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {allCollapsed ? "Expand all" : "Collapse all"}
    </button>
  )

  return (
    <OverviewPanel title="Plugins" count={plugins.length} actions={actions}>
      {plugins.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No plugins</p>
      ) : (
        <div className="space-y-0.5">
          {plugins.map((plugin) => (
            <PluginTreeItem
              key={plugin.id}
              plugin={plugin}
              expanded={!collapsed.has(plugin.id)}
              onToggle={() => toggle(plugin.id)}
            />
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}

function PluginTreeItem({
  plugin,
  expanded,
  onToggle,
}: {
  plugin: Plugin
  expanded: boolean
  onToggle: () => void
}) {
  const contents = plugin.contents
  const skillCount = contents?.skills?.length ?? 0
  const mcpCount = contents?.mcpServers?.length ?? 0
  const hookCount = contents?.hooks
    ? Object.values(contents.hooks).reduce(
        (n, groups) => n + groups.reduce((m, g) => m + g.hooks.length, 0),
        0,
      )
    : 0
  const hasContents = skillCount > 0 || mcpCount > 0 || hookCount > 0

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="size-3 shrink-0 flex items-center">
          {hasContents ? (
            expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )
          ) : null}
        </span>
        <Plug2Icon className="size-3 shrink-0 text-muted-foreground" />
        <span
          className={`truncate ${!plugin.enabled ? "text-muted-foreground/50" : ""}`}
        >
          {titleCase(plugin.name)}
        </span>
        {!plugin.enabled && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0">
            off
          </span>
        )}
      </div>

      {expanded && hasContents && (
        <div className="ml-6 space-y-0.5 pb-0.5">
          {skillCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <ScrollText className="size-3 shrink-0" />
              Skills ({skillCount})
            </div>
          )}
          {mcpCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Server className="size-3 shrink-0" />
              MCP: {contents!.mcpServers!.map((s) => s.name).join(", ")}
            </div>
          )}
          {hookCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Zap className="size-3 shrink-0" />
              Hooks ({hookCount})
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

---

## Task 3: McpDirectPanel (direct-only, no plugin-provided)

**Files:**
- Create: `src/features/dashboard/components/McpDirectPanel.tsx`

**Step 1: Write the component**

```tsx
// src/features/dashboard/components/McpDirectPanel.tsx
import { Server } from "lucide-react"
import { useMcpQuery } from "@/features/mcp-editor/api/mcp.queries"
import { OverviewPanel } from "./OverviewPanel"

export function McpDirectPanel() {
  const { data: servers = [] } = useMcpQuery()
  // Plugin-provided servers are visible in the Plugins panel — exclude them here
  const directServers = servers.filter((s) => !s.fromPlugin)

  return (
    <OverviewPanel title="MCP Servers" count={directServers.length}>
      {directServers.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No MCP servers</p>
      ) : (
        <div className="space-y-0.5">
          {directServers.map((server) => (
            <div
              key={`${server.scope}-${server.name}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
            >
              <Server className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{server.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                {server.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 2: Check `fromPlugin` exists on McpServer type**

```bash
grep -n "fromPlugin" src/shared/types.ts
```

Expected: should find it. If not, it's on the runtime data (added in mcp-service.ts line ~104).
In that case, cast: `(server as McpServer & { fromPlugin?: string }).fromPlugin`

**Step 3: Typecheck**

```bash
pnpm typecheck
```

---

## Task 4: SkillsPanel + AgentsPanel

**Files:**
- Create: `src/features/dashboard/components/SkillsPanel.tsx`
- Create: `src/features/dashboard/components/AgentsPanel.tsx`

**Step 1: Write SkillsPanel**

```tsx
// src/features/dashboard/components/SkillsPanel.tsx
import { ScrollText } from "lucide-react"
import { useAgentFiles } from "@/hooks/use-config"
import { OverviewPanel } from "./OverviewPanel"

export function SkillsPanel() {
  const {
    query: { data: files = [] },
  } = useAgentFiles("skill")

  return (
    <OverviewPanel title="Skills" count={files.length}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No skills</p>
      ) : (
        <div className="space-y-0.5">
          {files.map((file) => (
            <div
              key={`${file.scope}-${file.name}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
            >
              <ScrollText className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                {file.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 2: Write AgentsPanel** (same pattern, `type="agent"`, `Bot` icon)

```tsx
// src/features/dashboard/components/AgentsPanel.tsx
import { Bot } from "lucide-react"
import { useAgentFiles } from "@/hooks/use-config"
import { OverviewPanel } from "./OverviewPanel"

export function AgentsPanel() {
  const {
    query: { data: files = [] },
  } = useAgentFiles("agent")

  return (
    <OverviewPanel title="Agents" count={files.length}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No agents</p>
      ) : (
        <div className="space-y-0.5">
          {files.map((file) => (
            <div
              key={`${file.scope}-${file.name}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
            >
              <Bot className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                {file.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

---

## Task 5: HooksPanel

**Files:**
- Create: `src/features/dashboard/components/HooksPanel.tsx`

Note: `useHooksQuery(scope)` returns `HooksSettings = Partial<Record<HookEventName, HookMatcherGroup[]>>`.
Flatten to a list of `{ event, hook }` pairs for display.

**Step 1: Write the component**

```tsx
// src/features/dashboard/components/HooksPanel.tsx
import { Zap } from "lucide-react"
import { useHooksQuery } from "@/features/hooks-editor/api/hooks.queries"
import type { HookEventName } from "@/shared/types"
import { OverviewPanel } from "./OverviewPanel"

export function HooksPanel() {
  const { data: globalHooks = {} } = useHooksQuery("global")
  const { data: projectHooks = {} } = useHooksQuery("project")

  // Flatten HooksSettings → list of { event, scope }
  function flattenHooks(
    hooks: Partial<Record<HookEventName, unknown>>,
    scope: string,
  ): { event: string; scope: string; key: string }[] {
    return Object.entries(hooks).map(([event], i) => ({
      event,
      scope,
      key: `${scope}-${event}-${i}`,
    }))
  }

  const rows = [
    ...flattenHooks(globalHooks, "global"),
    ...flattenHooks(projectHooks, "project"),
  ]

  return (
    <OverviewPanel title="Hooks" count={rows.length}>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No hooks</p>
      ) : (
        <div className="space-y-0.5">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
            >
              <Zap className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{row.event}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                {row.scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

---

## Task 6: LspServersPanel

**Files:**
- Create: `src/features/dashboard/components/LspServersPanel.tsx`

LSP servers come only from plugins — derive from enriched plugin data.

**Step 1: Write the component**

```tsx
// src/features/dashboard/components/LspServersPanel.tsx
import { Code } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import { usePluginsQuery } from "@/features/plugins-editor/api/plugins.queries"
import { OverviewPanel } from "./OverviewPanel"

export function LspServersPanel() {
  const { activeProjectPath } = useProjectContext()
  const { data: plugins = [] } = usePluginsQuery(activeProjectPath ?? undefined)

  const lspServers = plugins.flatMap((p) =>
    (p.contents?.lspServers ?? []).map((s) => ({
      ...s,
      pluginName: p.name,
    })),
  )

  return (
    <OverviewPanel title="LSP Servers" count={lspServers.length}>
      {lspServers.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No LSP servers</p>
      ) : (
        <div className="space-y-0.5">
          {lspServers.map((server, i) => (
            <div
              key={`${server.name}-${i}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
            >
              <Code className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{server.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                {server.pluginName}
              </span>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

---

## Task 7: ProjectOverviewGrid + wire into DashboardPage

**Files:**
- Create: `src/features/dashboard/components/ProjectOverviewGrid.tsx`
- Modify: `src/routes/index.tsx` — remove stat cards, add grid

**Step 1: Create ProjectOverviewGrid**

```tsx
// src/features/dashboard/components/ProjectOverviewGrid.tsx
import { AgentsPanel } from "./AgentsPanel"
import { HooksPanel } from "./HooksPanel"
import { LspServersPanel } from "./LspServersPanel"
import { McpDirectPanel } from "./McpDirectPanel"
import { PluginsPanel } from "./PluginsPanel"
import { SkillsPanel } from "./SkillsPanel"

export function ProjectOverviewGrid() {
  return (
    <div className="h-full p-3 flex flex-col gap-3 overflow-hidden">
      {/* Top row — main panels, flex-1 to fill available height */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        <PluginsPanel />
        <McpDirectPanel />
        <SkillsPanel />
      </div>
      {/* Bottom row — secondary panels, fixed height */}
      <div className="grid grid-cols-3 gap-3 h-[160px] shrink-0">
        <HooksPanel />
        <AgentsPanel />
        <LspServersPanel />
      </div>
    </div>
  )
}
```

**Step 2: Replace DashboardPage in `src/routes/index.tsx`**

Remove all existing imports and code. New content:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { ProjectOverviewGrid } from "@/features/dashboard/components/ProjectOverviewGrid"

export const Route = createFileRoute("/")({ component: DashboardPage })

function DashboardPage() {
  return (
    <div className="h-full overflow-hidden">
      <ProjectOverviewGrid />
    </div>
  )
}
```

**Step 3: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors

**Step 4: Visual verification**

Start dev server (`pnpm dev`) and confirm:
- [ ] Dashboard shows 6 panels in 3+3 grid layout
- [ ] Plugins panel shows tree with expand/collapse
- [ ] "Collapse all" / "Expand all" button works
- [ ] MCP panel shows only direct servers (no `[Plugin: X]` badges)
- [ ] Skills, Agents, Hooks, LSP panels show correct counts

---

## Task 8: Hide plugin-provided servers from McpPageContent

**Files:**
- Modify: `src/features/mcp-editor/components/McpPageContent.tsx`

**Step 1: Find where servers are rendered and add filter**

Open `McpPageContent.tsx`. Find the line where the server list is used (look for `servers.map` or `filteredServers`). Add:

```tsx
// Filter out plugin-provided servers — they are visible in the Dashboard Plugins panel
const displayServers = servers.filter((s) => !s.fromPlugin)
```

Use `displayServers` instead of `servers` for rendering the list (keep mutations using original `servers`).

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Visual check** — MCP page should no longer show `[Plugin: context7]`, `[Plugin: oh-my-claudecode]` etc. or duplicate warnings.

---

## Task 9: Commit

```bash
git add src/features/dashboard/ src/routes/index.tsx src/features/mcp-editor/components/McpPageContent.tsx
git commit -m "feat(dashboard): replace stat cards with project overview grid

- Multi-panel grid: Plugins tree, MCP direct-only, Skills, Hooks, Agents, LSP
- Plugins panel: expand/collapse all, shows sub-components per plugin
- MCP panel: hides plugin-provided servers (visible in Plugins panel)
- Removes stat-card grid from dashboard"
```

---

## Notes for implementer

- `McpServer.fromPlugin` is added at runtime in `mcp-service.ts:104` but may not be in the TypeScript type. If typecheck fails, add `fromPlugin?: string` to `McpServer` in `src/shared/types.ts`.
- `useAgentFiles` returns `{ query, saveMutation, deleteMutation }` — use `query.data`.
- Hooks count: `useHooksQuery` returns `HooksSettings` keyed by event name. The panel counts unique events, not individual hook matchers — adjust `flattenHooks` if you want per-matcher count.
- The `HooksPanel` currently shows one row per event name. If you want one row per hook entry (more granular), iterate into `HookMatcherGroup[].hooks[]`.

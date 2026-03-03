# Sidebar Removal & Header-Centric Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the sidebar navigation and replace it with a minimal header (ProjectSwitcher + Settings), keeping the dashboard as the central experience with improved information density.

**Architecture:** Replace the SidebarProvider/AppSidebar/SidebarInset wrapper with a simple flex-col layout: AppHeader → main → StatusBar. Refactor ProjectSwitcher to be sidebar-independent. Enhance each dashboard panel to show secondary info (descriptions, transport types, command previews). Merge global/project settings into one `/settings` route.

**Tech Stack:** React 19, TanStack Router, TanStack Start, shadcn/ui (DropdownMenu, Button, Tabs), Tailwind CSS v4, Lucide icons

---

### Task 1: Refactor ProjectSwitcher to standalone component

**Files:**
- Modify: `src/components/ProjectSwitcher.tsx`

**Step 1: Remove sidebar dependencies**

Replace the entire file. Remove imports of `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `useSidebar`. Replace with `Button` from shadcn and keep existing `DropdownMenu` usage.

```tsx
import { Check, ChevronsUpDown, FolderOpen, Globe, Plus } from "lucide-react"
import { useState } from "react"
import { AddProjectDialog } from "@/components/AddProjectDialog"
import { useProjectContext } from "@/components/ProjectContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { shortenPath } from "@/lib/format"

export function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject, homedir } =
    useProjectContext()
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-2 px-2 h-9 data-[state=open]:bg-accent"
          >
            <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderOpen className="size-3.5" />
            </div>
            <div className="grid text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {activeProject?.name ?? "User Only"}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {activeProject
                  ? shortenPath(activeProject.path, homedir)
                  : "~/.claude"}
              </span>
            </div>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuItem
            onClick={() => setActiveProject(null)}
            className="gap-2 p-2"
          >
            <Globe className="size-4 shrink-0" />
            <span>User Only</span>
            {!activeProject && (
              <Check className="size-4 ml-auto shrink-0" />
            )}
          </DropdownMenuItem>

          {projects.length > 0 && <DropdownMenuSeparator />}

          {[...projects]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => (
              <DropdownMenuItem
                key={project.path}
                onClick={() => setActiveProject(project.path)}
                className="gap-2 p-2"
              >
                <FolderOpen className="size-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {shortenPath(project.path, homedir)}
                  </div>
                </div>
                {activeProject?.path === project.path && (
                  <Check className="size-4 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowAddDialog(true)}
            className="gap-2 p-2"
          >
            <Plus className="size-4 shrink-0" />
            <span>Add Project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddProjectDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors related to ProjectSwitcher

**Step 3: Commit**

```bash
git add src/components/ProjectSwitcher.tsx
git commit -m "refactor(ProjectSwitcher): remove sidebar dependencies"
```

---

### Task 2: Create AppHeader component

**Files:**
- Create: `src/components/layout/AppHeader.tsx`

**Step 1: Create the header component**

```tsx
import { Link } from "@tanstack/react-router"
import { SettingsIcon } from "lucide-react"
import { ProjectSwitcher } from "@/components/ProjectSwitcher"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
      <ProjectSwitcher />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <SettingsIcon className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </header>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors (note: `/settings` route doesn't exist yet — TanStack Router may warn, that's OK for now)

**Step 3: Commit**

```bash
git add src/components/layout/AppHeader.tsx
git commit -m "feat(AppHeader): create header with ProjectSwitcher and Settings link"
```

---

### Task 3: Replace Layout — remove sidebar, use AppHeader

**Files:**
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/routes/__root.tsx`

**Step 1: Rewrite Layout.tsx**

Remove `SidebarProvider`, `AppSidebar`, `SidebarInset`. Replace with `AppHeader` + `<main>` + `StatusBar`.

```tsx
import { AppHeader } from "@/components/layout/AppHeader"
import { StatusBar } from "@/components/layout/StatusBar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      <StatusBar />
    </div>
  )
}
```

**Step 2: Remove SidebarProvider from __root.tsx (if present)**

Check `__root.tsx` — currently `Layout` is called inside `ProjectProvider` and `TooltipProvider`. No changes needed to `__root.tsx` itself since `SidebarProvider` is inside `Layout.tsx`, not `__root.tsx`. Just verify imports are clean.

**Step 3: Verify the app renders**

Run: `pnpm typecheck`
Expected: Pass. The sidebar import in Layout is removed; Sidebar.tsx file stays but is unused.

**Step 4: Commit**

```bash
git add src/components/layout/Layout.tsx
git commit -m "feat(Layout): replace sidebar with AppHeader"
```

---

### Task 4: Update StatusBar — remove project path

**Files:**
- Modify: `src/components/layout/StatusBar.tsx`

**Step 1: Remove the project path section**

Remove the left-side `FolderOpen` icon + project path display. Keep CLI version + language on the right. Adjust layout so right-side items are pushed to the right.

In `StatusBar` component, replace the `<footer>` contents:

```tsx
export function StatusBar() {
  return (
    <footer className="relative z-20 flex h-6 shrink-0 items-center justify-end border-t bg-muted/30 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <StatusBarCliVersion />
        <div aria-hidden="true" className="h-3 w-px bg-border" />
        <StatusBarLanguage />
      </div>
    </footer>
  )
}
```

Also remove unused imports: `FolderOpen`, `useProjectContext`, `shortenPath`.

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/components/layout/StatusBar.tsx
git commit -m "refactor(StatusBar): remove project path display"
```

---

### Task 5: Create unified /settings route

**Files:**
- Create: `src/routes/settings/route.tsx`
- Modify: `src/routes/global/settings/route.tsx`
- Modify: `src/routes/project/settings/route.tsx`

**Step 1: Create the unified settings page**

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { ConfigPage } from "@/features/config-editor/components/ConfigPage"

export const Route = createFileRoute("/settings")({
  component: () => <ConfigPage />,
})
```

**Step 2: Redirect old routes**

`src/routes/global/settings/route.tsx`:
```tsx
import { Navigate, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/global/settings")({
  component: () => <Navigate to="/settings" />,
})
```

`src/routes/project/settings/route.tsx`:
```tsx
import { Navigate, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/project/settings")({
  component: () => <Navigate to="/settings" />,
})
```

**Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 4: Commit**

```bash
git add src/routes/settings/route.tsx src/routes/global/settings/route.tsx src/routes/project/settings/route.tsx
git commit -m "feat(settings): create unified /settings route with redirects"
```

---

### Task 6: Add href prop to OverviewPanel for title links

**Files:**
- Modify: `src/features/dashboard/components/OverviewPanel.tsx`

**Step 1: Add optional href prop**

```tsx
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface OverviewPanelProps {
  title: string
  count?: number
  actions?: ReactNode
  children: ReactNode
  className?: string
  href?: string
}

export function OverviewPanel({
  title,
  count,
  actions,
  children,
  className,
  href,
}: OverviewPanelProps) {
  const titleContent = (
    <>
      <span className="text-xs font-semibold">{title}</span>
      {count !== undefined && (
        <span className="text-[10px] text-muted-foreground">({count})</span>
      )}
    </>
  )

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-lg overflow-hidden min-h-0",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 h-10 shrink-0 border-b border-border bg-muted/30">
        {href ? (
          <Link
            to={href}
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            {titleContent}
          </Link>
        ) : (
          <div className="flex items-center gap-2">{titleContent}</div>
        )}
        {actions}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-1">{children}</div>
    </div>
  )
}
```

**Step 2: Pass href from ProjectOverviewGrid to each panel**

Modify `src/features/dashboard/components/ProjectOverviewGrid.tsx` — add `href` prop to each panel:

In the grid section, change:
```tsx
<PluginsPanel onSelectItem={setSelected} href="/plugins" />
<McpDirectPanel onSelectItem={setSelected} href="/mcp" />
<SkillsPanel onSelectItem={setSelected} href="/skills" />
```
and bottom row:
```tsx
<HooksPanel onSelectItem={setSelected} href="/hooks" />
<AgentsPanel onSelectItem={setSelected} href="/agents" />
<LspServersPanel />
```

Each panel needs to accept and forward `href` to `OverviewPanel`. Add `href?: string` to each panel's props interface and pass it through:

```tsx
// Example for SkillsPanel — same pattern for all panels
interface SkillsPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  href?: string
}

export function SkillsPanel({ onSelectItem, href }: SkillsPanelProps) {
  // ...
  return (
    <OverviewPanel title="Skills" count={files.length} href={href}>
      {/* ... */}
    </OverviewPanel>
  )
}
```

Apply same pattern to: `PluginsPanel`, `McpDirectPanel`, `HooksPanel`, `AgentsPanel`.

**Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 4: Commit**

```bash
git add src/features/dashboard/components/OverviewPanel.tsx \
        src/features/dashboard/components/ProjectOverviewGrid.tsx \
        src/features/dashboard/components/SkillsPanel.tsx \
        src/features/dashboard/components/McpDirectPanel.tsx \
        src/features/dashboard/components/HooksPanel.tsx \
        src/features/dashboard/components/AgentsPanel.tsx \
        src/features/dashboard/components/PluginsPanel.tsx
git commit -m "feat(dashboard): add panel header title links to detail pages"
```

---

### Task 7: Enhance Skills panel — add description

**Files:**
- Modify: `src/features/dashboard/components/SkillsPanel.tsx`

**Step 1: Show frontmatter description**

The `AgentFile` type has `frontmatter?.description`. Show it as trailing text in `ListItem`.

```tsx
{items.map((file) => (
  <ListItem
    key={`${file.scope}-${file.name}`}
    icon={ScrollText}
    label={file.frontmatter?.name ?? file.name}
    trailing={
      file.frontmatter?.description ? (
        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
          {file.frontmatter.description}
        </span>
      ) : undefined
    }
    onClick={() => onSelectItem?.({ type: "skill", skill: file })}
  />
))}
```

Note: Check if `ListItem` supports a `trailing` prop. If not, an alternative approach is needed — possibly using a custom layout within `ListItem` or wrapping with additional elements. Verify the `ListItem` component API first at `src/components/ui/list-item.tsx`.

**Step 2: Verify typecheck + visual check**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/SkillsPanel.tsx
git commit -m "feat(dashboard): show skill description in Skills panel"
```

---

### Task 8: Enhance Agents panel — add description

**Files:**
- Modify: `src/features/dashboard/components/AgentsPanel.tsx`

**Step 1: Show frontmatter description**

Same pattern as Skills — `AgentFile` has `frontmatter?.description`.

```tsx
{items.map((file) => (
  <ListItem
    key={`${file.scope}-${file.name}`}
    icon={ENTITY_ICONS.agent}
    label={file.frontmatter?.name ?? file.name}
    trailing={
      file.frontmatter?.description ? (
        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
          {file.frontmatter.description}
        </span>
      ) : undefined
    }
    onClick={() => onSelectItem?.({ type: "agent", agent: file })}
  />
))}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/AgentsPanel.tsx
git commit -m "feat(dashboard): show agent description in Agents panel"
```

---

### Task 9: Enhance MCP panel — add transport type

**Files:**
- Modify: `src/features/dashboard/components/McpDirectPanel.tsx`

**Step 1: Show transport type as trailing badge**

`McpServer` has `type: "stdio" | "sse" | "streamable-http"`. Show it as small text.

```tsx
{items.map((server) => (
  <ListItem
    key={`${server.scope}-${server.name}`}
    icon={ENTITY_ICONS.mcp}
    iconClassName={getMcpIconClass(server, statusMap)}
    label={server.name}
    trailing={
      <span className="text-[10px] text-muted-foreground">
        {server.type}
      </span>
    }
    onClick={() => onSelectItem?.({ type: "mcp", server })}
  />
))}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/McpDirectPanel.tsx
git commit -m "feat(dashboard): show transport type in MCP panel"
```

---

### Task 10: Enhance Hooks panel — add command preview

**Files:**
- Modify: `src/features/dashboard/components/HooksPanel.tsx`

**Step 1: Show first hook's command as trailing text**

`HookEntry` has `command?: string`. Show truncated command preview.

```tsx
{globalItems.map(({ event, firstHook, matcher }) => (
  <ListItem
    key={`global-${event}`}
    icon={Zap}
    label={event}
    trailing={
      firstHook?.command ? (
        <span className="text-[10px] text-muted-foreground truncate max-w-[200px] font-mono">
          {firstHook.command}
        </span>
      ) : undefined
    }
    onClick={() =>
      firstHook &&
      onSelectItem?.({
        type: "hook",
        hook: firstHook,
        event,
        matcher,
      })
    }
  />
))}
```

Apply same trailing pattern to `projectItems` map.

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/HooksPanel.tsx
git commit -m "feat(dashboard): show command preview in Hooks panel"
```

---

### Task 11: Enhance Plugins panel — add sub-item count summary

**Files:**
- Modify: `src/features/dashboard/components/PluginsPanel.tsx`

**Step 1: Add content summary to plugin items**

For plugins with contents, show a compact summary like "3 skills, 2 hooks" as trailing text.

Add a helper function:

```tsx
function pluginContentSummary(plugin: Plugin): string | null {
  const contents = plugin.contents
  if (!contents) return null
  const parts: string[] = []
  if (contents.skills.length > 0) parts.push(`${contents.skills.length}S`)
  if (contents.agents.length > 0) parts.push(`${contents.agents.length}A`)
  if (contents.mcpServers.length > 0) parts.push(`${contents.mcpServers.length}M`)
  const hookCount = Object.keys(contents.hooks ?? {}).length
  if (hookCount > 0) parts.push(`${hookCount}H`)
  return parts.length > 0 ? parts.join(" · ") : null
}
```

Then in `PluginTreeItem`, use it as trailing alongside the existing off badge:

```tsx
const summary = pluginContentSummary(plugin)
const trailing = (
  <span className="flex items-center gap-1.5">
    {summary && (
      <span className="text-[10px] text-muted-foreground">{summary}</span>
    )}
    {!plugin.enabled && (
      <span className="text-[10px] text-muted-foreground/40">off</span>
    )}
  </span>
)
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/PluginsPanel.tsx
git commit -m "feat(dashboard): show sub-item count summary in Plugins panel"
```

---

### Task 12: Final verification & cleanup

**Files:**
- Verify all changes work together

**Step 1: Run full quality checks**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: All pass

**Step 2: Visual verification**

Start dev server and verify:
- Header shows ProjectSwitcher (left) + Settings icon (right)
- No sidebar visible
- Dashboard grid fills full width
- Panel titles link to detail pages
- Panels show enhanced info (descriptions, transport types, command previews, sub-item counts)
- Detail panel (right side) still works on item click
- `/settings` route works
- `/global/settings` and `/project/settings` redirect to `/settings`
- StatusBar shows CLI version + language only (no project path)
- Old routes still accessible via direct URL (/skills, /hooks, etc.)

**Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: sidebar removal cleanup"
```

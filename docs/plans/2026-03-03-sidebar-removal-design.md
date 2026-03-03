# Sidebar Removal & Header-Centric Layout Redesign

**Date**: 2026-03-03
**Status**: Approved

## Motivation

The sidebar navigation adds little value — users end up viewing the dashboard for a unified overview rather than navigating category-by-category pages. Items like plugin-provided skills vs directly installed skills overlap across pages, making the dashboard the most practical way to see everything at once.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Sidebar | Remove entirely |
| Header | Left: ProjectSwitcher, Right: Settings icon |
| Category pages | Keep routes, hide from navigation (URL-accessible) |
| Dashboard grid | Keep 3x2, increase info density per panel |
| Detail panel | Keep current (inline 400px + Sheet for narrow) |
| Settings | Merge global/project into `/settings` with tabs |
| StatusBar | Remove project path (moved to header), keep CLI version + language |

## Layout Structure

```text
┌─────────────────────────────────────────────────────────┐
│ [▼ ProjectSwitcher]                          [⚙]        │  AppHeader (h-12)
├─────────────────────────────────────────────────────────┤
│  ┌─Plugins─────┐ ┌─MCP Servers──┐ ┌─Skills──────────┐  │
│  │             │ │              │ │                 │  │  top row (flex-1)
│  ├─────────────┤ ├──────────────┤ ├─────────────────┤  │
│  ┌─Hooks───────┐ ┌─Agents───────┐ ┌─LSP────────────┐  │
│  │             │ │              │ │                 │  │  bottom row (160px)
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
│                                     [detail panel →]    │
├─────────────────────────────────────────────────────────┤
│ CLI 2.1.50 ✓                                      🇺🇸   │  StatusBar (h-6)
└─────────────────────────────────────────────────────────┘
```

## AppHeader

New component: `src/components/layout/AppHeader.tsx`

- **Left**: ProjectSwitcher — refactored to standalone (remove `SidebarMenu`, `SidebarMenuButton`, `useSidebar` dependencies). Uses `DropdownMenu` + `Button` only.
- **Right**: Settings icon — `<Link to="/settings">` with `SettingsIcon`.
- **Height**: h-12 (48px), border-bottom.

## ProjectSwitcher Refactoring

Current dependencies to remove:
- `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` → `Button` + `DropdownMenu`
- `useSidebar().isMobile` → dropdown always opens `bottom`

Preserves: project list, active project state, "Add Project" action.

## Dashboard Panel Density Improvements

Each panel gains secondary information in the available horizontal space:

| Panel | Current | Added |
|-------|---------|-------|
| Plugins | name + off badge | sub-item count summary (e.g. "3 skills, 2 hooks") |
| MCP Servers | name + status dot | transport type (stdio/sse) |
| Skills | name only | frontmatter description (truncated) |
| Hooks | event name only | command preview (truncated) |
| Agents | name only | description (truncated) |
| LSP | no change | no change |

Panel header titles become links to their respective detail pages (e.g. "Skills (5)" → `/skills`).

## OverviewPanel Link Enhancement

Add optional `href` prop to `OverviewPanel`. When provided, the title renders as a `<Link>` with subtle hover styling.

## Routing Changes

| Route | Change |
|-------|--------|
| `/settings` | **New** — unified Global/Project settings with tabs |
| `/global/settings` | Redirect to `/settings` |
| `/project/settings` | Redirect to `/settings` |
| All other routes | No change (kept but hidden from navigation) |

## StatusBar Changes

Remove the project path display (left side) — this info moves to the header's ProjectSwitcher. Keep CLI version + language switcher on the right.

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `layout/Layout.tsx` | Major edit | Remove SidebarProvider, use AppHeader + main |
| `layout/AppHeader.tsx` | New | Header with ProjectSwitcher + Settings |
| `layout/Sidebar.tsx` | Unused | Remove imports (keep file) |
| `ProjectSwitcher.tsx` | Edit | Remove sidebar dependencies |
| `layout/StatusBar.tsx` | Edit | Remove project path |
| `__root.tsx` | Edit | Remove SidebarProvider |
| `routes/settings/route.tsx` | New | Unified settings page |
| `routes/global/settings/route.tsx` | Edit | Redirect to /settings |
| `routes/project/settings/route.tsx` | Edit | Redirect to /settings |
| `dashboard/OverviewPanel.tsx` | Edit | Add href prop for title link |
| `dashboard/ProjectOverviewGrid.tsx` | Edit | Pass href to panels |
| `dashboard/SkillsPanel.tsx` | Edit | Add description display |
| `dashboard/McpDirectPanel.tsx` | Edit | Add transport type |
| `dashboard/HooksPanel.tsx` | Edit | Add command preview |
| `dashboard/AgentsPanel.tsx` | Edit | Add description display |
| `dashboard/PluginsPanel.tsx` | Edit | Add sub-item count summary |

## Out of Scope

- Deleting shadcn sidebar UI component files
- Modifying detail panel components
- Server-side service/API changes
- Category page content changes

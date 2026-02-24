# Code Quality: Feature-Based Structure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize hooks-editor and skills-editor into feature-based folders with colocated server functions, query hooks, and decomposed sub-components. Migrate routes from flat to directory-based structure.

**Architecture:** Hybrid approach — components/ internal is feature-based (layout/, features/), while server/, services/, hooks/ remain as technical layers. Shared components stay at components/ root (no shared/ subfolder needed since components/ itself is the shared layer). Feature-specific server functions and React Query hooks are colocated inside feature folders.

**Tech Stack:** TanStack Start, TanStack Router (directory routes), TanStack Query v5, React 19, TypeScript strict, shadcn/ui, Zod

**Design doc:** `docs/plans/2026-02-24-code-quality-feature-structure-design.md`

---

## Important Notes

### Shared Code — Do NOT Move

Analysis revealed that `server/items.ts` and `useAgentFiles()` in `hooks/use-config.ts` are **shared** between skills-editor and `FilesPageContent.tsx`. Per colocation principle (2곳 이상 공유 시 공유 위치 유지), these stay in their current locations:

- `src/server/items.ts` → stays (used by `useAgentFiles` which serves both skills and files pages)
- `useAgentFiles()` in `src/hooks/use-config.ts` → stays (imported by `SkillsPageContent` and `FilesPageContent`)

### Shared Components — Stay at components/ Root

Feature-based 구조에서 `components/` 자체가 공유 레이어이므로 `shared/` 하위 폴더 불필요:
- `FileViewer.tsx`, `ScopeBadge.tsx`, `ErrorBoundary.tsx` 등은 `src/components/` 루트에 그대로 유지
- Import 경로 변경 없음: `@/components/FileViewer` 그대로

### What CAN Be Colocated

- `src/server/hooks.ts` → hooks-editor (only used by `useHooks` and `HookDetailPanel`)
- `useHooks()` from `use-config.ts` → hooks-editor (only used by `HooksPageContent`)
- `src/server/skills.ts` → skills-editor (only used by `SkillsPageContent` via dynamic import)

### Validation After Every Task

```bash
pnpm typecheck && pnpm lint && pnpm build
```

If tests exist for moved files, also run `pnpm test`.

---

## Task 1: Create layout/ folder, move layout components

**Files:**
- Create: `src/components/layout/` (directory)
- Create: `src/components/features/` (directory)
- Move: `src/components/Layout.tsx` → `src/components/layout/Layout.tsx`
- Move: `src/components/Sidebar.tsx` → `src/components/layout/Sidebar.tsx`
- Move: `src/components/StatusBar.tsx` → `src/components/layout/StatusBar.tsx`

**Step 1: Create directories**

```bash
mkdir -p src/components/layout src/components/features
```

**Step 2: Move layout components**

```bash
git mv src/components/Layout.tsx src/components/layout/Layout.tsx
git mv src/components/Sidebar.tsx src/components/layout/Sidebar.tsx
git mv src/components/StatusBar.tsx src/components/layout/StatusBar.tsx
```

**Step 3: Update import paths**

**`@/components/Layout` → `@/components/layout/Layout`:**
- `src/routes/__root.tsx` → update import

**`@/components/Sidebar` → `@/components/layout/Sidebar`:**
- `src/components/layout/Layout.tsx` internal import

**`@/components/StatusBar` → `@/components/layout/StatusBar`:**
- `src/components/layout/Layout.tsx` internal import

Note: Sidebar.tsx and StatusBar.tsx import from `@/components/ProjectContext`, `@/components/ProjectSwitcher` etc. — these paths remain unchanged since those files stay at components/ root.

**Step 4: Validate**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(components): move layout components to layout/"
```

---

## Task 2: Decompose HooksPageContent into sub-components

**Files:**
- Create: `src/components/features/hooks-editor/components/` (directory)
- Create: `src/components/features/hooks-editor/constants.ts`
- Create: `src/components/features/hooks-editor/components/HookDetailPanel.tsx`
- Create: `src/components/features/hooks-editor/components/HooksScopeSection.tsx`
- Create: `src/components/features/hooks-editor/components/AddHookDialog.tsx`
- Create: `src/components/features/hooks-editor/components/HooksPageContent.tsx`
- Delete: `src/components/pages/HooksPageContent.tsx`
- Modify: `src/routes/hooks.tsx` (update import path)

**Step 1: Create directories**

```bash
mkdir -p src/components/features/hooks-editor/components
```

**Step 2: Extract constants.ts**

Create `src/components/features/hooks-editor/constants.ts` with:
- `SelectedHook` interface (lines 93-100)
- `getHookDisplayName()` function (lines 104-122)
- `getHookIcon()` function (lines 124-135)
- `HOOK_EVENT_META` constant (lines 139-249)
- `EVENT_GROUPS` constant (lines 252-283)
- `HOOK_HANDLER_DESC` constant (lines 285-289)
- `HOOK_SCOPE_DESC` constant (lines 291-295)
- `HOOK_TEMPLATES` constant (lines 299-344)
- `hookFormSchema` (lines 500-511)

All necessary imports (lucide icons, types, zod, paraglide messages).
Export everything as named exports.

**Step 3: Extract HookDetailPanel.tsx**

Create `src/components/features/hooks-editor/components/HookDetailPanel.tsx` with:
- `HookDetailPanel` function component (lines 363-496)
- `DetailField` inline component (lines 346-361) — temporarily keep here; will extract to shared in Task 5
- Import `SelectedHook` from `../constants`
- Import `FileViewer` from `@/components/FileViewer`
- Keep the `useQuery` for `readScriptFn` (dynamic import path will change in Task 3)

**Step 4: Extract HooksScopeSection.tsx**

Create `src/components/features/hooks-editor/components/HooksScopeSection.tsx` with:
- `HooksScopeSection` function component (lines 940-1076)
- Import `SelectedHook`, `getHookDisplayName`, `getHookIcon` from `../constants`
- Import necessary types from `@/shared/types`

**Step 5: Extract AddHookDialog.tsx**

Create `src/components/features/hooks-editor/components/AddHookDialog.tsx` with:
- `AddHookDialog` function component (lines 513-936)
- Import `hookFormSchema`, `HOOK_EVENT_META`, `EVENT_GROUPS`, `HOOK_HANDLER_DESC`, `HOOK_SCOPE_DESC`, `HOOK_TEMPLATES` from `../constants`
- Import `useHooks` from `@/hooks/use-config` (will change path in Task 3)
- Import `SelectedHook` from `../constants`

**Step 6: Create slimmed HooksPageContent.tsx**

Create `src/components/features/hooks-editor/components/HooksPageContent.tsx` with:
- `HooksPageContent` export function (lines 1080-1334)
- Import sub-components from sibling files:
  - `HookDetailPanel` from `./HookDetailPanel`
  - `HooksScopeSection` from `./HooksScopeSection`
  - `AddHookDialog` from `./AddHookDialog`
- Import `SelectedHook`, `getHookDisplayName` from `../constants`
- Import `useHooks` from `@/hooks/use-config`
- Import `useProjectContext` from `@/components/ProjectContext`
- Keep: state management, skeleton, layout composition, delete dialog, scope mutation routing

**Step 7: Delete old file**

```bash
rm src/components/pages/HooksPageContent.tsx
```

**Step 8: Update route import**

`src/routes/hooks.tsx`: change import from `"@/components/pages/HooksPageContent"` → `"@/components/features/hooks-editor/components/HooksPageContent"`

**Step 9: Validate**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

**Step 10: Commit**

```bash
git add -A && git commit -m "refactor(hooks): decompose HooksPageContent into sub-components"
```

---

## Task 3: Colocate hooks-editor server functions and query hooks

**Files:**
- Create: `src/components/features/hooks-editor/api/` (directory)
- Move: `src/server/hooks.ts` → `src/components/features/hooks-editor/api/hooks.functions.ts`
- Create: `src/components/features/hooks-editor/api/hooks.queries.ts` (extract from use-config.ts)
- Modify: `src/hooks/use-config.ts` (remove useHooks, lines 305-372)
- Modify: `src/components/features/hooks-editor/components/HooksPageContent.tsx` (update import)
- Modify: `src/components/features/hooks-editor/components/HookDetailPanel.tsx` (update dynamic import)
- Modify: `src/components/features/hooks-editor/components/AddHookDialog.tsx` (update import)

**Step 1: Create api directory**

```bash
mkdir -p src/components/features/hooks-editor/api
```

**Step 2: Move server/hooks.ts**

```bash
git mv src/server/hooks.ts src/components/features/hooks-editor/api/hooks.functions.ts
```

No internal changes needed — it uses `@/services/hooks-service` and `@/server/config` which stay in place.

**Step 3: Create hooks.queries.ts**

Extract `useHooks()` (use-config.ts lines 307-372) into `src/components/features/hooks-editor/api/hooks.queries.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { queryKeys } from "@/lib/query-keys"
import type { HookScope } from "@/shared/types"

export const FREQUENT_REFETCH = {
  refetchOnWindowFocus: true,
  refetchInterval: 5000,
} as const

export function useHooks(scope: HookScope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const needsProject = scope === "project" || scope === "local"

  const query = useQuery({
    queryKey: queryKeys.hooks.byScope(
      scope,
      needsProject ? activeProjectPath : undefined,
    ),
    queryFn: async () => {
      const { getHooksFn } = await import("./hooks.functions")
      return getHooksFn({
        data: { scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const addMutation = useMutation({
    mutationFn: async (params: {
      event: import("@/shared/types").HookEventName
      matcherGroup: import("@/shared/types").HookMatcherGroup
    }) => {
      const { addHookFn } = await import("./hooks.functions")
      return addHookFn({
        data: {
          scope,
          event: params.event,
          matcherGroup: params.matcherGroup,
          projectPath: activeProjectPath,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hooks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (params: {
      event: import("@/shared/types").HookEventName
      groupIndex: number
      hookIndex: number
    }) => {
      const { removeHookFn } = await import("./hooks.functions")
      return removeHookFn({
        data: {
          scope,
          event: params.event,
          groupIndex: params.groupIndex,
          hookIndex: params.hookIndex,
          projectPath: activeProjectPath,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hooks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  return { query, addMutation, removeMutation }
}
```

Key change: dynamic imports now use `"./hooks.functions"` instead of `"@/server/hooks"`.

**Step 4: Remove useHooks from use-config.ts**

Remove lines 305-372 (the `// ── Hooks ──` section and `useHooks` function) from `src/hooks/use-config.ts`.

Also check: `FREQUENT_REFETCH` is exported from use-config.ts (line 11) and used by multiple hooks in that file. Keep it in use-config.ts as well (both files export it). Later when all features are colocated, it can move to a shared constant.

**Step 5: Update imports in hooks-editor components**

- `HooksPageContent.tsx`: change `import { useHooks } from "@/hooks/use-config"` → `import { useHooks } from "../api/hooks.queries"`
- `AddHookDialog.tsx`: change `useHooks` import similarly
- `HookDetailPanel.tsx`: change dynamic import `await import("@/server/hooks")` → `await import("../api/hooks.functions")`

**Step 6: Validate**

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor(hooks): colocate server functions and query hooks"
```

---

## Task 4: Decompose SkillsPageContent and colocate skills-editor

**Files:**
- Create: `src/components/features/skills-editor/` (directory tree)
- Create: `src/components/features/skills-editor/components/SkillsPageContent.tsx`
- Create: `src/components/features/skills-editor/components/SkillDetailPanel.tsx`
- Create: `src/components/features/skills-editor/components/SkillsScopeSection.tsx`
- Create: `src/components/features/skills-editor/components/AddSkillDialog.tsx`
- Create: `src/components/features/skills-editor/components/SupportingFilePanel.tsx`
- Create: `src/components/features/skills-editor/api/skills.functions.ts`
- Create: `src/components/features/skills-editor/constants.ts`
- Delete: `src/components/pages/SkillsPageContent.tsx`
- Delete: `src/server/skills.ts`
- Modify: `src/routes/skills.tsx` (update import path)

**Step 1: Create directories**

```bash
mkdir -p src/components/features/skills-editor/components
mkdir -p src/components/features/skills-editor/api
```

**Step 2: Move server/skills.ts**

```bash
git mv src/server/skills.ts src/components/features/skills-editor/api/skills.functions.ts
```

No internal changes needed — `@/server/config` and `@/services/config-service` stay in place.

**Step 3: Create constants.ts**

Create `src/components/features/skills-editor/constants.ts` with:
- `extractBody()` utility function (lines 77-80)
- `addSkillSchema` Zod schema (lines 84-91)
- `FrontmatterBadges` component (lines 95-153) — only used by SkillDetailPanel

Export all as named exports.

**Step 4: Extract SkillDetailPanel.tsx**

Create `src/components/features/skills-editor/components/SkillDetailPanel.tsx` with:
- `SkillDetailPanel` function component (lines 157-338)
- Import `extractBody`, `FrontmatterBadges` from `../constants`
- Import `FileViewer` from `@/components/FileViewer`
- Update dynamic imports:
  - `await import("@/server/items")` stays (items is shared)
  - `await import("@/server/skills")` → `await import("../api/skills.functions")`

**Step 5: Extract SkillsScopeSection.tsx**

Create `src/components/features/skills-editor/components/SkillsScopeSection.tsx` with:
- `SkillsScopeSection` function component (lines 342-599)
- Import types from `@/shared/types`

**Step 6: Extract AddSkillDialog.tsx**

Create `src/components/features/skills-editor/components/AddSkillDialog.tsx` with:
- `AddSkillDialog` function component (lines 603-728)
- Import `addSkillSchema` from `../constants`
- Update dynamic import: `await import("@/server/skills")` → `await import("../api/skills.functions")`

**Step 7: Extract SupportingFilePanel.tsx**

Create `src/components/features/skills-editor/components/SupportingFilePanel.tsx` with:
- `SupportingFilePanel` function component (lines 732-775)
- Import `extractBody` from `../constants`
- Update dynamic import: `await import("@/server/skills")` → `await import("../api/skills.functions")`

**Step 8: Create slimmed SkillsPageContent.tsx**

Create `src/components/features/skills-editor/components/SkillsPageContent.tsx` with:
- `SkillsPageContent` export function (lines 779-937)
- Import sub-components from sibling files
- Import `useAgentFiles` from `@/hooks/use-config` (stays shared)
- Import `useProjectContext` from `@/components/ProjectContext`

**Step 9: Delete old file and update route**

```bash
rm src/components/pages/SkillsPageContent.tsx
```

`src/routes/skills.tsx`: change import from `"@/components/pages/SkillsPageContent"` → `"@/components/features/skills-editor/components/SkillsPageContent"`

**Step 10: Validate**

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

**Step 11: Commit**

```bash
git add -A && git commit -m "refactor(skills): decompose and colocate skills-editor feature"
```

---

## Task 5: Extract DetailField shared widget

**Files:**
- Create: `src/components/DetailField.tsx`
- Modify: `src/components/features/hooks-editor/components/HookDetailPanel.tsx` (remove inline DetailField, import from shared)

**Step 1: Create shared DetailField component**

Create `src/components/DetailField.tsx`:

```tsx
export function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
```

**Step 2: Update HookDetailPanel.tsx**

- Remove inline `DetailField` function definition
- Add import: `import { DetailField } from "@/components/DetailField"`

**Step 3: Validate**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(shared): extract DetailField common widget"
```

---

## Task 6: Migrate routes from flat to directory-based

**Files:**
- Move 19 route files from flat to directory structure
- Stays: `__root.tsx`, `index.tsx`, `api/health.ts`

### Migration Map

| Current (Flat) | New (Directory) | Type |
|----------------|-----------------|------|
| `hooks.tsx` | `hooks/route.tsx` | leaf page |
| `skills.tsx` | `skills/route.tsx` | leaf page |
| `files.tsx` | `files/route.tsx` | redirect (leaf) |
| `plugins.tsx` | `plugins/index.tsx` | redirect (has param sibling) |
| `plugins.$id.tsx` | `plugins/$id/route.tsx` | redirect |
| `mcp.tsx` | `mcp/index.tsx` | redirect (has param sibling) |
| `mcp.$name.tsx` | `mcp/$name/route.tsx` | redirect |
| `global.tsx` | `global/route.tsx` | layout |
| `global/files.tsx` | `global/files/route.tsx` | leaf page |
| `global/plugins.tsx` | `global/plugins/index.tsx` | list page (has param sibling) |
| `global/plugins.$id.tsx` | `global/plugins/$id/route.tsx` | detail page |
| `global/mcp.tsx` | `global/mcp/index.tsx` | list page (has param sibling) |
| `global/mcp.$name.tsx` | `global/mcp/$name/route.tsx` | detail page |
| `global/settings.tsx` | `global/settings/route.tsx` | leaf page |
| `project.tsx` | `project/route.tsx` | layout |
| `project/files.tsx` | `project/files/route.tsx` | leaf page |
| `project/plugins.tsx` | `project/plugins/index.tsx` | list page |
| `project/plugins.$id.tsx` | `project/plugins/$id/route.tsx` | detail page |
| `project/mcp.tsx` | `project/mcp/index.tsx` | list page |
| `project/mcp.$name.tsx` | `project/mcp/$name/route.tsx` | detail page |
| `project/settings.tsx` | `project/settings/route.tsx` | leaf page |

**Step 1: Create new directories**

```bash
mkdir -p src/routes/hooks src/routes/skills src/routes/files
mkdir -p src/routes/plugins/\$id src/routes/mcp/\$name
mkdir -p src/routes/global/files src/routes/global/settings
mkdir -p src/routes/global/plugins/\$id src/routes/global/mcp/\$name
mkdir -p src/routes/project/files src/routes/project/settings
mkdir -p src/routes/project/plugins/\$id src/routes/project/mcp/\$name
```

**Step 2: Move top-level leaf routes**

```bash
git mv src/routes/hooks.tsx src/routes/hooks/route.tsx
git mv src/routes/skills.tsx src/routes/skills/route.tsx
git mv src/routes/files.tsx src/routes/files/route.tsx
```

**Step 3: Move top-level redirect routes (with param siblings)**

```bash
git mv src/routes/plugins.tsx src/routes/plugins/index.tsx
git mv src/routes/plugins.\$id.tsx src/routes/plugins/\$id/route.tsx
git mv src/routes/mcp.tsx src/routes/mcp/index.tsx
git mv src/routes/mcp.\$name.tsx src/routes/mcp/\$name/route.tsx
```

**Step 4: Move layout routes into their directories**

```bash
git mv src/routes/global.tsx src/routes/global/route.tsx
git mv src/routes/project.tsx src/routes/project/route.tsx
```

**Step 5: Move global scope child routes**

```bash
git mv src/routes/global/files.tsx src/routes/global/files/route.tsx
git mv src/routes/global/settings.tsx src/routes/global/settings/route.tsx
git mv src/routes/global/plugins.tsx src/routes/global/plugins/index.tsx
git mv src/routes/global/plugins.\$id.tsx src/routes/global/plugins/\$id/route.tsx
git mv src/routes/global/mcp.tsx src/routes/global/mcp/index.tsx
git mv src/routes/global/mcp.\$name.tsx src/routes/global/mcp/\$name/route.tsx
```

**Step 6: Move project scope child routes**

```bash
git mv src/routes/project/files.tsx src/routes/project/files/route.tsx
git mv src/routes/project/settings.tsx src/routes/project/settings/route.tsx
git mv src/routes/project/plugins.tsx src/routes/project/plugins/index.tsx
git mv src/routes/project/plugins.\$id.tsx src/routes/project/plugins/\$id/route.tsx
git mv src/routes/project/mcp.tsx src/routes/project/mcp/index.tsx
git mv src/routes/project/mcp.\$name.tsx src/routes/project/mcp/\$name/route.tsx
```

**Step 7: Regenerate route tree and fix path strings**

TanStack Router auto-generates `routeTree.gen.ts` based on file locations. After moving files:

1. Run dev server briefly to trigger route tree regeneration, OR use the TanStack Router CLI
2. The `createFileRoute('/path')` string in each file must match the new auto-generated route ID
3. Run `pnpm typecheck` — any path string mismatches will show as TypeScript errors
4. Fix any mismatched `createFileRoute` path strings

```bash
pnpm typecheck
# Fix any createFileRoute path string mismatches
pnpm typecheck && pnpm lint && pnpm build
```

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor(routes): migrate from flat to directory-based routing"
```

---

## Task 7: Final cleanup and verification

**Step 1: Verify no stale files**

```bash
# Check for any remaining references to old paths
grep -r '"@/components/pages/HooksPageContent"' src/ || echo "OK: no stale HooksPageContent imports"
grep -r '"@/components/pages/SkillsPageContent"' src/ || echo "OK: no stale SkillsPageContent imports"
grep -r '"@/server/hooks"' src/ || echo "OK: no stale server/hooks imports"
grep -r '"@/server/skills"' src/ || echo "OK: no stale server/skills imports"
```

**Step 2: Verify old directories are clean**

```bash
ls src/components/pages/  # Should still have: FilesPageContent, PluginsPageContent, McpPageContent, PluginDetailContent, McpDetailContent
ls src/server/           # Should still have: config.ts, validation.ts, overview.ts, claude-md.ts, plugins.ts, mcp.ts, items.ts, settings.ts, projects.ts, cli-status.ts, middleware/
```

**Step 3: Full validation**

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

**Step 4: Verify new structure**

```bash
find src/components/layout src/components/features -type f | sort
```

Expected output:
```text
src/components/features/hooks-editor/api/hooks.functions.ts
src/components/features/hooks-editor/api/hooks.queries.ts
src/components/features/hooks-editor/components/AddHookDialog.tsx
src/components/features/hooks-editor/components/HookDetailPanel.tsx
src/components/features/hooks-editor/components/HooksPageContent.tsx
src/components/features/hooks-editor/components/HooksScopeSection.tsx
src/components/features/hooks-editor/constants.ts
src/components/features/skills-editor/api/skills.functions.ts
src/components/features/skills-editor/components/AddSkillDialog.tsx
src/components/features/skills-editor/components/SkillDetailPanel.tsx
src/components/features/skills-editor/components/SkillsPageContent.tsx
src/components/features/skills-editor/components/SkillsScopeSection.tsx
src/components/features/skills-editor/components/SupportingFilePanel.tsx
src/components/features/skills-editor/constants.ts
src/components/layout/Layout.tsx
src/components/layout/Sidebar.tsx
src/components/layout/StatusBar.tsx
```

**Step 5: Verify routes structure**

```bash
find src/routes -type f | sort
```

Expected output:
```text
src/routes/__root.tsx
src/routes/api/health.ts
src/routes/files/route.tsx
src/routes/global/files/route.tsx
src/routes/global/mcp/index.tsx
src/routes/global/mcp/$name/route.tsx
src/routes/global/plugins/index.tsx
src/routes/global/plugins/$id/route.tsx
src/routes/global/route.tsx
src/routes/global/settings/route.tsx
src/routes/hooks/route.tsx
src/routes/index.tsx
src/routes/mcp/index.tsx
src/routes/mcp/$name/route.tsx
src/routes/plugins/index.tsx
src/routes/plugins/$id/route.tsx
src/routes/project/files/route.tsx
src/routes/project/mcp/index.tsx
src/routes/project/mcp/$name/route.tsx
src/routes/project/plugins/index.tsx
src/routes/project/plugins/$id/route.tsx
src/routes/project/route.tsx
src/routes/project/settings/route.tsx
src/routes/skills/route.tsx
```

---

## Summary

| Task | Files Changed | Key Risk |
|------|---------------|----------|
| 1. layout/ folder | 3 moved, ~3 import updates | Minimal — fewest consumers |
| 2. hooks-editor decompose | 5 new files, 1 deleted | Component boundary cuts — props passing |
| 3. hooks-editor API colocate | 2 new files, 1 moved, 3 updated | Dynamic import paths |
| 4. skills-editor full | 7 new files, 2 deleted/moved | Largest task — do carefully |
| 5. DetailField extract | 1 new file, 1 updated | Minimal risk |
| 6. routes directory migration | 19 files moved, 0 content changes | createFileRoute path string auto-update |
| 7. Final cleanup | 0 files | Verification only |

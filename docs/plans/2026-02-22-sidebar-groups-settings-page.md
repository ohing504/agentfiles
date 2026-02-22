# Sidebar Group Restructure + Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the sidebar into Global/Project groups and add a Settings page to manage `settings.json` (editable) and `~/.claude.json` (read-only).

**Architecture:** Routes are restructured from flat (`/files`, `/plugins`, `/mcp`) to scoped (`/global/files`, `/project/files`). Each existing page component receives a `scope` prop to filter items. A new Settings page displays settings.json fields as editable form cards and ~/.claude.json as read-only info cards. The sidebar uses two `SidebarGroup` sections (Global, Project) with the same nav items in each.

**Tech Stack:** TanStack Start (Router + Server Functions), React 19, TanStack Query, shadcn/ui, Tailwind CSS v4, Paraglide i18n, Zod, Vitest

---

## Task 1: Add i18n Messages

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ko.json`

**Step 1: Add new i18n keys to en.json**

Add these keys to `messages/en.json`:

```json
{
  "nav_group_global": "Global",
  "nav_group_project": "Project",
  "nav_settings": "Settings",
  "settings_general": "General",
  "settings_model": "Model",
  "settings_env": "Environment Variables",
  "settings_status_line": "Status Line",
  "settings_install_info": "Install Info",
  "settings_feature_flags": "Feature Flags",
  "settings_permissions": "Permissions",
  "settings_shared": "Shared Settings",
  "settings_local": "Local Settings",
  "settings_no_project": "Select a project to view project settings",
  "settings_save_success": "Settings saved",
  "settings_save_error": "Failed to save settings",
  "settings_key": "Key",
  "settings_value": "Value",
  "settings_add": "Add",
  "settings_remove": "Remove",
  "settings_enabled": "Enabled",
  "settings_disabled": "Disabled",
  "settings_on": "On",
  "settings_off": "Off"
}
```

**Step 2: Add Korean translations to ko.json**

Add corresponding Korean keys to `messages/ko.json`:

```json
{
  "nav_group_global": "글로벌",
  "nav_group_project": "프로젝트",
  "nav_settings": "설정",
  "settings_general": "일반",
  "settings_model": "모델",
  "settings_env": "환경 변수",
  "settings_status_line": "상태 라인",
  "settings_install_info": "설치 정보",
  "settings_feature_flags": "기능 플래그",
  "settings_permissions": "권한",
  "settings_shared": "공유 설정",
  "settings_local": "로컬 설정",
  "settings_no_project": "프로젝트 설정을 보려면 프로젝트를 선택하세요",
  "settings_save_success": "설정이 저장되었습니다",
  "settings_save_error": "설정 저장에 실패했습니다",
  "settings_key": "키",
  "settings_value": "값",
  "settings_add": "추가",
  "settings_remove": "삭제",
  "settings_enabled": "활성화됨",
  "settings_disabled": "비활성화됨",
  "settings_on": "켜짐",
  "settings_off": "꺼짐"
}
```

**Step 3: Run typecheck to verify i18n compilation**

Run: `pnpm typecheck`
Expected: PASS (paraglide auto-generates typed message functions)

**Step 4: Commit**

```bash
git add messages/en.json messages/ko.json
git commit -m "feat(i18n): add settings page and sidebar group messages"
```

---

## Task 2: Add Settings Types

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Add Settings-related types to types.ts**

Append after `ProjectsConfig` interface:

```typescript
// ── Settings ──
export interface GlobalSettings {
  model?: string
  alwaysThinkingEnabled?: boolean
  skipDangerousModePermissionPrompt?: boolean
  enableAllProjectMcpServers?: boolean
  env?: Record<string, string>
  statusLine?: {
    type?: string
    command?: string
  }
  enabledPlugins?: Record<string, boolean> | string[]
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProjectSettings {
  enabledPlugins?: Record<string, boolean> | string[]
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProjectLocalSettings {
  permissions?: {
    allow?: string[]
    deny?: string[]
  }
  [key: string]: unknown
}

export interface ClaudeAppJson {
  numStartups?: number
  installMethod?: string
  autoUpdates?: boolean
  cachedStatsigGates?: Record<string, boolean>
  [key: string]: unknown
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add settings and claude app json types"
```

---

## Task 3: Add Settings Service Functions

**Files:**
- Modify: `src/services/config-service.ts` (export `readSettingsJson`, add new functions)
- Modify: `src/services/file-writer.ts` (add `writeSettingsJson`)

**Step 1: Write failing test for settings service**

Create: `tests/unit/settings-service.test.ts`

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest"

// We'll test the service functions after they exist
describe("settings service", () => {
  it("readSettingsJson returns parsed JSON from settings.json", async () => {
    const { readSettingsJson } = await import("@/services/config-service")
    // Call with a non-existent path should return {}
    const result = await readSettingsJson("/tmp/nonexistent-settings-test")
    expect(result).toEqual({})
  })

  it("readClaudeAppJson returns parsed ~/.claude.json", async () => {
    const { readClaudeAppJson } = await import("@/services/config-service")
    const result = await readClaudeAppJson()
    // Should return an object (may or may not have data depending on env)
    expect(typeof result).toBe("object")
  })

  it("readProjectLocalSettings returns parsed settings.local.json", async () => {
    const { readProjectLocalSettings } = await import("@/services/config-service")
    const result = await readProjectLocalSettings("/tmp/nonexistent-settings-test")
    expect(result).toEqual({})
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/settings-service.test.ts`
Expected: FAIL (functions not exported yet)

**Step 3: Export readSettingsJson and add new functions to config-service.ts**

In `src/services/config-service.ts`:

1. Export the existing `readSettingsJson` function (change from `async function` to `export async function`)
2. Add `readClaudeAppJson()`:

```typescript
export async function readClaudeAppJson(): Promise<Record<string, unknown>> {
  const claudeJsonPath = path.join(os.homedir(), ".claude.json")
  try {
    const content = await fs.readFile(claudeJsonPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}
```

3. Add `readProjectLocalSettings()`:

```typescript
export async function readProjectLocalSettings(
  projectPath?: string,
): Promise<Record<string, unknown>> {
  const basePath = getProjectConfigPath(projectPath)
  const localSettingsPath = path.join(basePath, "settings.local.json")
  try {
    const content = await fs.readFile(localSettingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}
```

**Step 4: Add writeSettingsJson to file-writer.ts**

```typescript
export async function writeSettingsJson(
  basePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(basePath, { recursive: true })
  const filePath = path.join(basePath, "settings.json")
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8")
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test tests/unit/settings-service.test.ts`
Expected: PASS

**Step 6: Run full checks**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/config-service.ts src/services/file-writer.ts tests/unit/settings-service.test.ts
git commit -m "feat(services): add settings read/write service functions"
```

---

## Task 4: Add Settings Server Functions

**Files:**
- Create: `src/server/settings.ts`

**Step 1: Create server functions for settings**

Create `src/server/settings.ts` following the existing pattern from `src/server/overview.ts`:

```typescript
import { createServerFn } from "@tanstack/react-start"

export const getSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { scope: "global" | "project"; projectPath?: string }) => data)
  .handler(async ({ data }) => {
    const { readSettingsJson, getGlobalConfigPath, getProjectConfigPath } =
      await import("@/services/config-service")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    return readSettingsJson(basePath)
  })

export const saveSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      scope: "global" | "project"
      projectPath?: string
      settings: Record<string, unknown>
    }) => data,
  )
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { writeSettingsJson } = await import("@/services/file-writer")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    await writeSettingsJson(basePath, data.settings)
    return { success: true }
  })

export const getClaudeAppJsonFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readClaudeAppJson } = await import("@/services/config-service")
    return readClaudeAppJson()
  },
)

export const getProjectLocalSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string }) => data)
  .handler(async ({ data }) => {
    const { readProjectLocalSettings } = await import(
      "@/services/config-service"
    )
    return readProjectLocalSettings(data.projectPath)
  })
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/server/settings.ts
git commit -m "feat(server): add settings server functions"
```

---

## Task 5: Add Settings React Query Hooks

**Files:**
- Modify: `src/lib/query-keys.ts`
- Modify: `src/hooks/use-config.ts`

**Step 1: Add query keys for settings**

In `src/lib/query-keys.ts`, add after `cliStatus`:

```typescript
settings: {
  all: ["settings"] as const,
  byScope: (scope: Scope, projectPath?: string) =>
    [...queryKeys.settings.all, scope, projectPath] as const,
},

claudeAppJson: {
  all: ["claude-app-json"] as const,
},

projectLocalSettings: {
  all: ["project-local-settings"] as const,
  byProject: (projectPath?: string) =>
    [...queryKeys.projectLocalSettings.all, projectPath] as const,
},
```

**Step 2: Add hooks to use-config.ts**

Add to `src/hooks/use-config.ts`:

```typescript
// ── Settings ─────────────────────────────────────────────────────────────────

export function useSettings(scope: Scope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.settings.byScope(scope, scope === "project" ? activeProjectPath : undefined),
    queryFn: async () => {
      const { getSettingsFn } = await import("@/server/settings")
      return getSettingsFn({
        data: { scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { saveSettingsFn } = await import("@/server/settings")
      return saveSettingsFn({
        data: { scope, projectPath: activeProjectPath, settings },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.byScope(scope, scope === "project" ? activeProjectPath : undefined),
      })
    },
  })

  return { query, mutation }
}

// ── Claude App JSON (read-only) ──────────────────────────────────────────────

export function useClaudeAppJson() {
  return useQuery({
    queryKey: queryKeys.claudeAppJson.all,
    queryFn: async () => {
      const { getClaudeAppJsonFn } = await import("@/server/settings")
      return getClaudeAppJsonFn()
    },
    ...INFREQUENT_REFETCH,
  })
}

// ── Project Local Settings ───────────────────────────────────────────────────

export function useProjectLocalSettings() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.projectLocalSettings.byProject(activeProjectPath),
    queryFn: async () => {
      const { getProjectLocalSettingsFn } = await import("@/server/settings")
      return getProjectLocalSettingsFn({
        data: { projectPath: activeProjectPath },
      })
    },
    ...INFREQUENT_REFETCH,
  })
}
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/query-keys.ts src/hooks/use-config.ts
git commit -m "feat(hooks): add settings and claude app json query hooks"
```

---

## Task 6: Create Route Files for New Structure

**Files:**
- Create: `src/routes/global/settings.tsx`
- Create: `src/routes/global/files.tsx`
- Create: `src/routes/global/plugins.tsx`
- Create: `src/routes/global/plugins.$id.tsx`
- Create: `src/routes/global/mcp.tsx`
- Create: `src/routes/global/mcp.$name.tsx`
- Create: `src/routes/project/settings.tsx`
- Create: `src/routes/project/files.tsx`
- Create: `src/routes/project/plugins.tsx`
- Create: `src/routes/project/plugins.$id.tsx`
- Create: `src/routes/project/mcp.tsx`
- Create: `src/routes/project/mcp.$name.tsx`

TanStack Router uses file-based routing. For nested routes under `/global/...`, we need either:
- A `src/routes/global/` folder with route files, OR
- Route files named `global.settings.tsx` etc.

The folder approach is cleaner. We need `_layout` files for the `global` and `project` path segments.

**Step 1: Create global and project layout routes**

Create `src/routes/global.tsx` (pathless layout):

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/global")({
  component: () => <Outlet />,
})
```

Create `src/routes/project.tsx`:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/project")({
  component: () => <Outlet />,
})
```

**Step 2: Create Global Settings page (the new page)**

Create `src/routes/global/settings.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { GlobalSettingsPage } from "@/components/settings/GlobalSettingsPage"

export const Route = createFileRoute("/global/settings")({
  component: GlobalSettingsPage,
})
```

**Step 3: Create scoped wrapper routes for existing pages**

For each existing page, create a thin wrapper that passes `scope` prop.

Create `src/routes/global/files.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { FilesPageContent } from "@/components/pages/FilesPageContent"

export const Route = createFileRoute("/global/files")({
  component: () => <FilesPageContent scope="global" />,
})
```

Create `src/routes/global/plugins.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { PluginsPageContent } from "@/components/pages/PluginsPageContent"

export const Route = createFileRoute("/global/plugins")({
  component: () => <PluginsPageContent scope="user" />,
})
```

Create `src/routes/global/plugins.$id.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { PluginDetailContent } from "@/components/pages/PluginDetailContent"

export const Route = createFileRoute("/global/plugins/$id")({
  component: PluginDetailPage,
})

function PluginDetailPage() {
  const { id } = Route.useParams()
  return <PluginDetailContent id={id} scope="user" />
}
```

Create `src/routes/global/mcp.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { McpPageContent } from "@/components/pages/McpPageContent"

export const Route = createFileRoute("/global/mcp")({
  component: () => <McpPageContent scope="global" />,
})
```

Create `src/routes/global/mcp.$name.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { McpDetailContent } from "@/components/pages/McpDetailContent"

export const Route = createFileRoute("/global/mcp/$name")({
  component: McpDetailPage,
})

function McpDetailPage() {
  const { name } = Route.useParams()
  return <McpDetailContent name={name} scope="global" />
}
```

Create matching project routes:

- `src/routes/project/settings.tsx` → `ProjectSettingsPage` component
- `src/routes/project/files.tsx` → `<FilesPageContent scope="project" />`
- `src/routes/project/plugins.tsx` → `<PluginsPageContent scope="project" />`
- `src/routes/project/plugins.$id.tsx` → `<PluginDetailContent id={id} scope="project" />`
- `src/routes/project/mcp.tsx` → `<McpPageContent scope="project" />`
- `src/routes/project/mcp.$name.tsx` → `<McpDetailContent name={name} scope="project" />`

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: FAIL (component imports don't exist yet — that's expected, we'll create them in Tasks 7-9)

**Step 5: Commit**

```bash
git add src/routes/global.tsx src/routes/project.tsx src/routes/global/ src/routes/project/
git commit -m "feat(routes): add global and project scoped route files"
```

---

## Task 7: Extract Existing Pages into Scope-aware Components

This is the core refactoring. Extract the rendering logic from each existing route page into a reusable component that accepts a `scope` prop.

**Files:**
- Create: `src/components/pages/PluginsPageContent.tsx` (extracted from `src/routes/plugins.tsx`)
- Create: `src/components/pages/PluginDetailContent.tsx` (extracted from `src/routes/plugins.$id.tsx`)
- Create: `src/components/pages/McpPageContent.tsx` (extracted from `src/routes/mcp.tsx`)
- Create: `src/components/pages/McpDetailContent.tsx` (extracted from `src/routes/mcp.$name.tsx`)
- Create: `src/components/pages/FilesPageContent.tsx` (extracted from `src/routes/files.tsx`)

**Step 1: Extract PluginsPageContent**

Create `src/components/pages/PluginsPageContent.tsx`:

- Copy `PluginCard`, `PluginListSkeleton`, and the page body from `src/routes/plugins.tsx`
- Accept `scope: "user" | "project"` prop
- Filter plugins by scope instead of showing both sections
- Change `Link` targets from `/plugins/$id` to scope-aware paths:
  - scope="user" → `/global/plugins/$id`
  - scope="project" → `/project/plugins/$id`

Key changes:
```tsx
interface Props {
  scope: "user" | "project"
}

export function PluginsPageContent({ scope }: Props) {
  const { query } = usePlugins()
  const { data: cliStatus } = useCliStatus()
  const allPlugins = query.data ?? []
  const plugins = allPlugins.filter((p) => p.scope === scope)
  const cliAvailable = cliStatus?.available ?? false
  // ... render single list (no Global/Project sections)
}
```

Update `PluginCard` Link to use scope-aware path:
```tsx
const basePath = scope === "user" ? "/global/plugins" : "/project/plugins"
// <Link to={`${basePath}/${encodeURIComponent(plugin.id)}`}>
```

**Step 2: Extract PluginDetailContent**

Create `src/components/pages/PluginDetailContent.tsx`:

- Copy the page body from `src/routes/plugins.$id.tsx`
- Accept `{ id: string; scope: "user" | "project" }` props
- Update back link to scope-aware path

**Step 3: Extract McpPageContent**

Create `src/components/pages/McpPageContent.tsx`:

- Copy from `src/routes/mcp.tsx`
- Accept `{ scope: Scope }` prop
- Filter `mcpServers` by scope
- Update `Link` targets for detail pages
- For "Add MCP" dialog, pass the scope

**Step 4: Extract McpDetailContent**

Create `src/components/pages/McpDetailContent.tsx`:

- Copy from `src/routes/mcp.$name.tsx`
- Accept `{ name: string; scope: Scope }` props

**Step 5: Extract FilesPageContent**

Create `src/components/pages/FilesPageContent.tsx`:

- Copy from `src/routes/files.tsx`
- Accept `{ scope: Scope }` prop
- Filter files by scope (global: `~/.claude/`, project: `.claude/`)
- The current Files page shows both scopes in a unified tree — we need to split:
  - Global: show global CLAUDE.md + global agents/commands/skills
  - Project: show project CLAUDE.md + project-scoped agents/commands/skills + nested CLAUDE.md files

**Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (or warnings about unused old route files)

**Step 7: Commit**

```bash
git add src/components/pages/
git commit -m "feat(components): extract scope-aware page content components"
```

---

## Task 8: Update Old Route Files as Redirects

**Files:**
- Modify: `src/routes/files.tsx`
- Modify: `src/routes/plugins.tsx`
- Modify: `src/routes/plugins.$id.tsx`
- Modify: `src/routes/mcp.tsx`
- Modify: `src/routes/mcp.$name.tsx`

**Step 1: Convert old routes to redirects**

Replace each old route with a redirect to the global equivalent. This preserves any bookmarks.

`src/routes/files.tsx`:
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/files")({
  beforeLoad: () => {
    throw redirect({ to: "/global/files" })
  },
  component: () => null,
})
```

Same pattern for `/plugins` → `/global/plugins`, `/mcp` → `/global/mcp`, etc.

For parameterized routes like `/plugins/$id`:
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/plugins/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/global/plugins/$id", params: { id: params.id } })
  },
  component: () => null,
})
```

**Step 2: Run dev server and verify redirects**

Run: `pnpm build` (to verify route generation)
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/files.tsx src/routes/plugins.tsx src/routes/plugins.\$id.tsx src/routes/mcp.tsx src/routes/mcp.\$name.tsx
git commit -m "refactor(routes): redirect old flat routes to scoped routes"
```

---

## Task 9: Create Global Settings Page Component

**Files:**
- Create: `src/components/settings/GlobalSettingsPage.tsx`

**Step 1: Build the Global Settings page**

This page shows two sections:

**Section A: settings.json (Editable)**

Cards:
1. **General** card — model (Select: opus/sonnet/haiku), boolean toggles (alwaysThinkingEnabled, skipDangerousModePermissionPrompt, enableAllProjectMcpServers)
2. **Environment** card — key-value editor for `env` object
3. **Status Line** card — type (Select), command (Input)

**Section B: ~/.claude.json (Read-only)**

Cards:
1. **Install Info** card — installMethod, numStartups, autoUpdates (badges/text)
2. **Feature Flags** card — cachedStatsigGates as on/off badges (collapsible)

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSettings, useClaudeAppJson } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
// ... shadcn form components (Input, Select, Switch, Button, Badge, Collapsible)

export function GlobalSettingsPage() {
  const { query: settingsQuery, mutation } = useSettings("global")
  const { data: claudeAppJson } = useClaudeAppJson()
  const settings = settingsQuery.data ?? {}

  // ... form state and handlers

  return (
    <div className="space-y-8">
      {/* Editable settings.json section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">settings.json</h2>
        <GeneralSettingsCard settings={settings} onSave={mutation.mutate} />
        <EnvSettingsCard settings={settings} onSave={mutation.mutate} />
        <StatusLineCard settings={settings} onSave={mutation.mutate} />
      </section>

      {/* Read-only ~/.claude.json section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">~/.claude.json</h2>
        <InstallInfoCard data={claudeAppJson} />
        <FeatureFlagsCard data={claudeAppJson} />
      </section>
    </div>
  )
}
```

Each card is a sub-component within the same file (keep it simple, split only if file > 300 lines).

**Key UI patterns:**
- **Model select**: Use shadcn `Select` with options opus, sonnet, haiku
- **Boolean toggles**: Use shadcn `Switch` component
- **Env editor**: List of key-value inputs with Add/Remove buttons
- **Feature flags**: `Collapsible` with `Badge` variant="outline" showing on/off status

**Step 2: Install required shadcn components if missing**

Check which components are needed: `Switch`, `Select`, `Collapsible`, `Label`, `Input` — install any that are missing.

Run: `npx shadcn@latest add switch select collapsible label` (skip already-installed ones)

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/settings/
git commit -m "feat(settings): add global settings page component"
```

---

## Task 10: Create Project Settings Page Component

**Files:**
- Create: `src/components/settings/ProjectSettingsPage.tsx`

**Step 1: Build the Project Settings page**

This page shows:

**Section A: .claude/settings.json (Editable)**
- Key-value display of any overrides (non-mcpServers, non-enabledPlugins since those are managed by their own pages)

**Section B: .claude/settings.local.json (Read-only display, editable permissions)**
- Permissions card: `allow` and `deny` rule lists

When no project is selected, show a message: "Select a project to view project settings"

```tsx
import { useProjectContext } from "@/components/ProjectContext"
import { useSettings, useProjectLocalSettings } from "@/hooks/use-config"

export function ProjectSettingsPage() {
  const { activeProjectPath } = useProjectContext()

  if (!activeProjectPath) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Settings className="w-10 h-10" />
        <p className="text-sm">{m.settings_no_project()}</p>
      </div>
    )
  }

  return <ProjectSettingsContent />
}

function ProjectSettingsContent() {
  const { query: settingsQuery, mutation } = useSettings("project")
  const { data: localSettings } = useProjectLocalSettings()
  // ... render cards
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/settings/ProjectSettingsPage.tsx
git commit -m "feat(settings): add project settings page component"
```

---

## Task 11: Restructure Sidebar into Global/Project Groups

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Refactor sidebar to use two groups**

Replace the single `navItems` array and single `SidebarGroup` with two groups:

```tsx
import { Settings } from "lucide-react" // add to existing imports
import { useProjectContext } from "@/components/ProjectContext"

const globalNavItems = [
  { to: "/global/settings", icon: Settings, labelFn: () => m.nav_settings() },
  { to: "/global/files", icon: FolderOpen, labelFn: () => m.nav_files() },
  { to: "/global/plugins", icon: Puzzle, labelFn: () => m.nav_plugins() },
  { to: "/global/mcp", icon: Server, labelFn: () => m.nav_mcp_servers() },
] as const

const projectNavItems = [
  { to: "/project/settings", icon: Settings, labelFn: () => m.nav_settings() },
  { to: "/project/files", icon: FolderOpen, labelFn: () => m.nav_files() },
  { to: "/project/plugins", icon: Puzzle, labelFn: () => m.nav_plugins() },
  { to: "/project/mcp", icon: Server, labelFn: () => m.nav_mcp_servers() },
] as const
```

Render:
```tsx
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { activeProjectPath } = useProjectContext()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_dashboard()}>
                  <Link to="/" activeProps={{ "data-active": true }} activeOptions={{ exact: true }}>
                    <LayoutDashboard />
                    <span>{m.nav_dashboard()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Global */}
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_group_global()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {globalNavItems.map(({ to, icon: Icon, labelFn }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={labelFn()}>
                    <Link to={to} activeProps={{ "data-active": true }}>
                      <Icon />
                      <span>{labelFn()}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Project (only when a project is selected) */}
        {activeProjectPath && (
          <SidebarGroup>
            <SidebarGroupLabel>{m.nav_group_project()}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map(({ to, icon: Icon, labelFn }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={labelFn()}>
                      <Link to={to} activeProps={{ "data-active": true }}>
                        <Icon />
                        <span>{labelFn()}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <LanguageSwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
```

**Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(sidebar): restructure into global and project groups"
```

---

## Task 12: Update Breadcrumb for New Route Structure

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: Update ROUTE_LABELS and buildBreadcrumbItems**

The new routes have the structure `/global/files`, `/global/plugins/$id`, `/project/mcp/$name`, etc.

Update the breadcrumb to handle this:

```typescript
const SCOPE_LABELS: Record<string, () => string> = {
  global: () => m.nav_group_global(),
  project: () => m.nav_group_project(),
}

const ROUTE_LABELS: Record<string, () => string> = {
  settings: () => m.nav_settings(),
  files: () => m.nav_files(),
  plugins: () => m.nav_plugins(),
  mcp: () => m.nav_mcp_servers(),
}

function buildBreadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const items: Array<{ label: string; href?: string }> = []

  if (segments.length === 0) {
    items.push({ label: m.nav_dashboard() })
    return items
  }

  // /global/... or /project/...
  const scopeLabel = SCOPE_LABELS[segments[0]]
  if (!scopeLabel) return items

  const routeLabel = segments[1] ? ROUTE_LABELS[segments[1]] : undefined

  if (!routeLabel) {
    items.push({ label: scopeLabel() })
    return items
  }

  if (segments.length === 2) {
    // /global/files → "Global > Files"
    items.push({ label: scopeLabel() })
    items.push({ label: routeLabel() })
  } else {
    // /global/plugins/some-id → "Global > Plugins > some-id"
    items.push({ label: scopeLabel() })
    items.push({ label: routeLabel(), href: `/${segments[0]}/${segments[1]}` })
    items.push({ label: decodeURIComponent(segments[2]) })
  }

  return items
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(breadcrumb): update for global/project route structure"
```

---

## Task 13: Quality Checks and Final Verification

**Step 1: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Run tests**

Run: `pnpm test`
Expected: ALL PASS (existing tests + new settings test)

**Step 4: Run build**

Run: `pnpm build`
Expected: PASS

**Step 5: Manual verification checklist**

- [ ] Navigate to `/` — Dashboard loads
- [ ] Sidebar shows Global group with Settings, Files, Plugins, MCP
- [ ] Select a project → Project group appears in sidebar
- [ ] `/global/settings` — settings.json cards render, model select works
- [ ] `/global/settings` — ~/.claude.json cards render (read-only)
- [ ] `/global/files` — shows only global files
- [ ] `/global/plugins` — shows only user-scoped plugins
- [ ] `/global/mcp` — shows only global MCP servers
- [ ] `/project/settings` — shows project settings.json and settings.local.json
- [ ] `/project/files` — shows only project files
- [ ] `/project/plugins` — shows only project-scoped plugins
- [ ] `/project/mcp` — shows only project MCP servers
- [ ] Old URLs (`/files`, `/plugins`, `/mcp`) redirect properly
- [ ] Breadcrumbs show correct hierarchy (e.g., "Global > Settings")
- [ ] Sidebar collapse works (icons only, tooltips show)
- [ ] Language switcher still works

**Step 6: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: sidebar group restructure and settings page complete"
```

---

## Task Dependencies

```
Task 1 (i18n) ────────────────────────┐
Task 2 (types) ───────────────────────┤
Task 3 (service) ─── Task 4 (server) ─┤── Task 5 (hooks) ── Task 9 (global settings) ──┐
                                       │                     Task 10 (project settings) ─┤
Task 6 (routes) ──────────────────────┤                                                  │
Task 7 (extract pages) ──────────────┤                                                  │
Task 8 (old redirects) ──────────────┤                                                  │
Task 11 (sidebar) ────────────────────┤                                                  │
Task 12 (breadcrumb) ─────────────────┤                                                  │
                                       └── Task 13 (final verification) ─────────────────┘
```

Tasks 1-4 can run in parallel. Task 5 depends on Tasks 2-4. Tasks 6-8 can run in parallel.
Tasks 9-10 depend on Task 5. Task 11 depends on Task 1. Task 12 depends on Task 1.
Task 13 depends on all previous tasks.

# Multi-Project Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to register multiple local projects and switch between them in the agentfiles UI, viewing each project's agent configuration alongside global settings.

**Architecture:** Frontend-driven approach — server stays stateless. ProjectContext (React Context) holds the active project path and passes it as a parameter to all server functions. Project list is persisted in `~/.claude/agentfiles.json`.

**Tech Stack:** TanStack Start (server functions), React 19, React Query, shadcn/ui (DropdownMenu, Collapsible, Dialog), TypeScript strict

---

## Task 1: Add Project type

**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/unit/types.test.ts`

**Step 1: Add Project interface to types.ts**

Add at the end of `src/shared/types.ts`:

```typescript
// ── Project ──
export interface Project {
  path: string
  name: string
  addedAt: string // ISO 8601
  hasClaudeDir?: boolean
}

export interface ProjectsConfig {
  projects: Project[]
  activeProject: string | null // project path or null for Global Only
}
```

**Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add Project and ProjectsConfig types"
```

---

## Task 2: Add project storage service

**Files:**
- Create: `src/services/project-store.ts`
- Test: `tests/unit/project-store.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/project-store.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import path from "node:path"
import os from "node:os"

// Mock fs
vi.mock("node:fs/promises")

describe("project-store", () => {
  const mockConfigPath = path.join(os.homedir(), ".claude", "agentfiles.json")

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns empty config when file does not exist", async () => {
    const fs = await import("node:fs/promises")
    vi.mocked(fs.readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" })
    )

    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()

    expect(config).toEqual({ projects: [], activeProject: null })
  })

  it("reads existing config file", async () => {
    const mockData = {
      projects: [{ path: "/foo/bar", name: "bar", addedAt: "2026-01-01T00:00:00Z" }],
      activeProject: "/foo/bar"
    }
    const fs = await import("node:fs/promises")
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData))

    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()

    expect(config.projects).toHaveLength(1)
    expect(config.activeProject).toBe("/foo/bar")
  })

  it("writes config file and creates directory if needed", async () => {
    const fs = await import("node:fs/promises")
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    const { writeProjectsConfig } = await import("@/services/project-store")
    await writeProjectsConfig({
      projects: [{ path: "/foo/bar", name: "bar", addedAt: "2026-01-01T00:00:00Z" }],
      activeProject: "/foo/bar"
    })

    expect(fs.mkdir).toHaveBeenCalledWith(
      path.join(os.homedir(), ".claude"),
      { recursive: true }
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      mockConfigPath,
      expect.any(String),
      "utf-8"
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/project-store.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/services/project-store.ts`:

```typescript
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { ProjectsConfig } from "@/shared/types"

const CONFIG_PATH = path.join(os.homedir(), ".claude", "agentfiles.json")

export async function readProjectsConfig(): Promise<ProjectsConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    return JSON.parse(content) as ProjectsConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { projects: [], activeProject: null }
    }
    throw err
  }
}

export async function writeProjectsConfig(config: ProjectsConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/project-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/project-store.ts tests/unit/project-store.test.ts
git commit -m "feat(services): add project-store for reading/writing agentfiles.json"
```

---

## Task 3: Add projectPath parameter to config-service

**Files:**
- Modify: `src/services/config-service.ts`
- Test: `tests/unit/config-service-project-path.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/config-service-project-path.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { getProjectConfigPath } from "@/services/config-service"

describe("getProjectConfigPath with projectPath", () => {
  it("returns custom project path when provided", () => {
    const result = getProjectConfigPath("/custom/project")
    expect(result).toBe("/custom/project/.claude")
  })

  it("falls back to cwd when no projectPath", () => {
    const result = getProjectConfigPath()
    expect(result).toContain(".claude")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/config-service-project-path.test.ts`
Expected: FAIL — getProjectConfigPath does not accept arguments

**Step 3: Update getProjectConfigPath**

In `src/services/config-service.ts`, change:

```typescript
// Before (line 22-24)
export function getProjectConfigPath(): string {
  return path.join(process.cwd(), ".claude")
}

// After
export function getProjectConfigPath(projectPath?: string): string {
  return path.join(projectPath ?? process.cwd(), ".claude")
}
```

**Step 4: Update all functions that call getProjectConfigPath**

Add `projectPath?: string` parameter to these functions and pass it through:

- `getClaudeMd(scope, projectPath?)` — line 27
- `getMcpServers(projectPath?)` — line 316
- `getOverview(projectPath?)` — line 341
- `getAgentFiles(type, projectPath?)` — line 429

Each function passes `projectPath` to `getProjectConfigPath(projectPath)`.

**Step 5: Run tests**

Run: `pnpm test`
Expected: ALL PASS (existing tests use default cwd behavior)

**Step 6: Commit**

```bash
git add src/services/config-service.ts tests/unit/config-service-project-path.test.ts
git commit -m "feat(config-service): add projectPath parameter to all query functions"
```

---

## Task 4: Add scanClaudeMdFiles function

**Files:**
- Modify: `src/services/config-service.ts`
- Test: `tests/unit/scan-claude-md.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/scan-claude-md.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest"
import path from "node:path"

vi.mock("node:fs/promises")

describe("scanClaudeMdFiles", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("finds CLAUDE.md files recursively", async () => {
    const fs = await import("node:fs/promises")

    // Mock directory structure with CLAUDE.md files
    const mockReaddir = vi.mocked(fs.readdir)
    mockReaddir.mockImplementation(async (dir: any) => {
      const dirStr = dir.toString()
      if (dirStr.endsWith("/test-project")) {
        return [
          { name: "CLAUDE.md", isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false },
          { name: ".claude", isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false },
          { name: "src", isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false },
          { name: "node_modules", isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false },
        ] as any
      }
      if (dirStr.endsWith("/.claude")) {
        return [
          { name: "CLAUDE.md", isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false },
        ] as any
      }
      if (dirStr.endsWith("/src")) {
        return [
          { name: "CLAUDE.md", isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false },
        ] as any
      }
      return []
    })

    vi.mocked(fs.stat).mockResolvedValue({
      size: 100,
      mtime: new Date("2026-01-01"),
    } as any)

    vi.mocked(fs.readFile).mockResolvedValue("# Test content")

    const { scanClaudeMdFiles } = await import("@/services/config-service")
    const files = await scanClaudeMdFiles("/test-project")

    expect(files.length).toBe(3)
    expect(files.map(f => f.relativePath)).toContain("CLAUDE.md")
    expect(files.map(f => f.relativePath)).toContain(".claude/CLAUDE.md")
    expect(files.map(f => f.relativePath)).toContain("src/CLAUDE.md")
  })

  it("skips excluded directories", async () => {
    const fs = await import("node:fs/promises")
    const mockReaddir = vi.mocked(fs.readdir)

    // Track which directories are read
    const readDirs: string[] = []
    mockReaddir.mockImplementation(async (dir: any) => {
      readDirs.push(dir.toString())
      return []
    })

    const { scanClaudeMdFiles } = await import("@/services/config-service")
    await scanClaudeMdFiles("/test-project")

    expect(readDirs).not.toContain(expect.stringContaining("node_modules"))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/scan-claude-md.test.ts`
Expected: FAIL — scanClaudeMdFiles not found

**Step 3: Write implementation**

Add to `src/services/config-service.ts`:

```typescript
// ── CLAUDE.md 재귀 탐색 (프로젝트 전체) ──

export interface ClaudeMdFile {
  relativePath: string  // e.g., "src/CLAUDE.md"
  absolutePath: string
  size: number
  lastModified: string
}

const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", "dist", ".output", "build",
  ".next", ".nuxt", ".turbo", "coverage", "__pycache__",
])

const MAX_DEPTH = 5

export async function scanClaudeMdFiles(projectPath: string): Promise<ClaudeMdFile[]> {
  const results: ClaudeMdFile[] = []

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "CLAUDE.md") {
        const fullPath = path.join(dir, entry.name)
        try {
          const stat = await fs.stat(fullPath)
          results.push({
            relativePath: path.relative(projectPath, fullPath),
            absolutePath: fullPath,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          })
        } catch {
          // skip unreadable files
        }
      } else if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), depth + 1)
      }
    }
  }

  await walk(projectPath, 0)
  return results
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/scan-claude-md.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/config-service.ts tests/unit/scan-claude-md.test.ts
git commit -m "feat(config-service): add scanClaudeMdFiles for recursive CLAUDE.md discovery"
```

---

## Task 5: Create server functions for project CRUD

**Files:**
- Create: `src/server/projects.ts`
- Modify: `src/server/validation.ts`
- Test: `tests/unit/server-projects.test.ts`

**Step 1: Add validateProjectPath to validation.ts**

Add to `src/server/validation.ts`:

```typescript
import path from "node:path"
import fs from "node:fs"

export function validateProjectPath(projectPath: string): string {
  const resolved = path.resolve(projectPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Invalid project path: ${projectPath}`)
  }
  return resolved
}
```

**Step 2: Create server/projects.ts**

```typescript
import { createServerFn } from "@tanstack/react-start"

export const getProjectsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()

    // Check hasClaudeDir for each project
    const fs = await import("node:fs")
    const path = await import("node:path")
    const projects = config.projects.map((p) => ({
      ...p,
      hasClaudeDir: fs.existsSync(path.join(p.path, ".claude")),
    }))

    return { projects, activeProject: config.activeProject }
  },
)

export const addProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }: { data: { path: string } }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )
    const nodePath = await import("node:path")

    const resolvedPath = validateProjectPath(data.path)

    const config = await readProjectsConfig()

    // Prevent duplicates
    if (config.projects.some((p) => p.path === resolvedPath)) {
      throw new Error(`Project already registered: ${resolvedPath}`)
    }

    const name = nodePath.basename(resolvedPath)
    config.projects.push({
      path: resolvedPath,
      name,
      addedAt: new Date().toISOString(),
    })
    config.activeProject = resolvedPath

    await writeProjectsConfig(config)
    return { success: true, path: resolvedPath, name }
  })

export const removeProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }: { data: { path: string } }) => {
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )

    const config = await readProjectsConfig()
    config.projects = config.projects.filter((p) => p.path !== data.path)

    if (config.activeProject === data.path) {
      config.activeProject = config.projects[0]?.path ?? null
    }

    await writeProjectsConfig(config)
    return { success: true }
  })

export const setActiveProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string | null }) => data)
  .handler(async ({ data }: { data: { path: string | null } }) => {
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )

    const config = await readProjectsConfig()
    config.activeProject = data.path

    await writeProjectsConfig(config)
    return { success: true }
  })

export const scanClaudeMdFilesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath: string }) => data)
  .handler(async ({ data }: { data: { projectPath: string } }) => {
    const { scanClaudeMdFiles } = await import("@/services/config-service")
    return scanClaudeMdFiles(data.projectPath)
  })
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/server/projects.ts src/server/validation.ts
git commit -m "feat(server): add project CRUD server functions"
```

---

## Task 6: Update existing server functions to accept projectPath

**Files:**
- Modify: `src/server/overview.ts`
- Modify: `src/server/claude-md.ts`
- Modify: `src/server/mcp.ts`
- Modify: `src/server/items.ts`

**Step 1: Update overview.ts**

```typescript
import { createServerFn } from "@tanstack/react-start"

export const getOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string }) => data)
  .handler(async ({ data }: { data: { projectPath?: string } }) => {
    const { getOverview: getOverviewService } = await import(
      "@/services/config-service"
    )
    return getOverviewService(data.projectPath)
  })
```

**Step 2: Update claude-md.ts**

Add `projectPath?: string` to both `getClaudeMdFn` and `saveClaudeMdFn` input validators and handlers. Pass `data.projectPath` to `getClaudeMd()` and `getProjectConfigPath()`.

**Step 3: Update mcp.ts**

Add `projectPath?: string` to `getMcpServersFn` input. Pass to `getMcpServers(data.projectPath)`.

**Step 4: Update items.ts**

Add `projectPath?: string` to `getItemsFn`, `getItemFn`, `saveItemFn`, `deleteItemFn`. Pass to `getAgentFiles(data.type, data.projectPath)` and `getProjectConfigPath(data.projectPath)`.

**Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/server/overview.ts src/server/claude-md.ts src/server/mcp.ts src/server/items.ts
git commit -m "feat(server): propagate projectPath through all server functions"
```

---

## Task 7: Create ProjectContext

**Files:**
- Create: `src/components/ProjectContext.tsx`
- Create: `src/hooks/use-projects.ts`

**Step 1: Create use-projects.ts hook**

Create `src/hooks/use-projects.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export function useProjects() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { getProjectsFn } = await import("@/server/projects")
      return getProjectsFn({ data: {} })
    },
  })

  const addMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const { addProjectFn } = await import("@/server/projects")
      return addProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const { removeProjectFn } = await import("@/server/projects")
      return removeProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async (projectPath: string | null) => {
      const { setActiveProjectFn } = await import("@/server/projects")
      return setActiveProjectFn({ data: { path: projectPath } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      // Invalidate all project-scoped queries
      queryClient.invalidateQueries({ queryKey: ["overview"] })
      queryClient.invalidateQueries({ queryKey: ["claude-md"] })
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] })
      queryClient.invalidateQueries({ queryKey: ["agent-files"] })
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
    },
  })

  return { query, addMutation, removeMutation, setActiveMutation }
}
```

**Step 2: Create ProjectContext.tsx**

```typescript
import { createContext, useContext } from "react"
import type { Project } from "@/shared/types"
import { useProjects } from "@/hooks/use-projects"

interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null
  activeProjectPath: string | undefined
  isLoading: boolean
  setActiveProject: (path: string | null) => void
  addProject: (path: string) => void
  removeProject: (path: string) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { query, addMutation, removeMutation, setActiveMutation } = useProjects()

  const projects = query.data?.projects ?? []
  const activeProjectPath = query.data?.activeProject ?? undefined
  const activeProject = projects.find((p) => p.path === activeProjectPath) ?? null

  const value: ProjectContextValue = {
    projects,
    activeProject,
    activeProjectPath,
    isLoading: query.isLoading,
    setActiveProject: (path) => setActiveMutation.mutate(path),
    addProject: (path) => addMutation.mutate(path),
    removeProject: (path) => removeMutation.mutate(path),
  }

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  )
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider")
  }
  return context
}
```

**Step 3: Wrap app with ProjectProvider**

In `src/routes/__root.tsx`, wrap `<Layout>` with `<ProjectProvider>`:

```tsx
import { ProjectProvider } from "@/components/ProjectContext"
// ...
<TooltipProvider delayDuration={300}>
  <ProjectProvider>
    <Layout>{children}</Layout>
  </ProjectProvider>
</TooltipProvider>
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ProjectContext.tsx src/hooks/use-projects.ts src/routes/__root.tsx
git commit -m "feat(frontend): add ProjectContext and useProjects hook"
```

---

## Task 8: Create ProjectSwitcher component

**Files:**
- Create: `src/components/ProjectSwitcher.tsx`

**Step 1: Create the component**

Create `src/components/ProjectSwitcher.tsx` using shadcn DropdownMenu pattern:

```tsx
import { ChevronsUpDown, FolderOpen, Globe, Plus, Settings, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useProjectContext } from "@/components/ProjectContext"
import { useState } from "react"
import { AddProjectDialog } from "@/components/AddProjectDialog"

export function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject } = useProjectContext()
  const { isMobile } = useSidebar()
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FolderOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeProject?.name ?? "Global Only"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeProject?.path ?? "~/.claude"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.path}
                  onClick={() => setActiveProject(project.path)}
                  className="gap-2 p-2"
                >
                  <FolderOpen className="size-4" />
                  <div className="flex-1 truncate">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {project.path}
                    </div>
                  </div>
                  {activeProject?.path === project.path && (
                    <Check className="size-4" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setActiveProject(null)}
                className="gap-2 p-2"
              >
                <Globe className="size-4" />
                <span>Global Only</span>
                {!activeProject && <Check className="size-4 ml-auto" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowAddDialog(true)}
                className="gap-2 p-2"
              >
                <Plus className="size-4" />
                <span>Add Project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </>
  )
}
```

**Step 2: Run typecheck (will fail — AddProjectDialog not yet created)**

This is expected. We'll create it in the next task.

**Step 3: Commit (partial — do NOT commit yet, continue to Task 9)**

---

## Task 9: Create AddProjectDialog component

**Files:**
- Create: `src/components/AddProjectDialog.tsx`

**Step 1: Create the dialog component**

Create `src/components/AddProjectDialog.tsx`:

```tsx
import { useState } from "react"
import { FolderOpen, Check, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProjectContext } from "@/components/ProjectContext"

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProjectDialog({ open, onOpenChange }: AddProjectDialogProps) {
  const { addProject } = useProjectContext()
  const [path, setPath] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!path.trim()) return
    setError(null)
    setIsAdding(true)
    try {
      addProject(path.trim())
      setPath("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project")
    } finally {
      setIsAdding(false)
    }
  }

  const handleFolderPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker()
        // File System Access API returns a handle, not a path
        // We need to use the name as a hint — but this API doesn't expose full paths
        // Fallback: user must type the path
        setError("Folder picker selected: " + dirHandle.name + ". Please enter the full path.")
      }
    } catch {
      // User cancelled or API not supported
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-path">Project Path</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                value={path}
                onChange={(e) => { setPath(e.target.value); setError(null) }}
                placeholder="/Users/you/workspace/my-project"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleFolderPicker}
                title="Browse folders"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!path.trim() || isAdding}>
            {isAdding && <Loader2 className="size-4 mr-2 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit Task 8 + 9 together**

```bash
git add src/components/ProjectSwitcher.tsx src/components/AddProjectDialog.tsx
git commit -m "feat(components): add ProjectSwitcher and AddProjectDialog"
```

---

## Task 10: Update Sidebar to use ProjectSwitcher

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Replace SidebarHeader content**

Replace the existing logo/header section in `Sidebar.tsx` with `ProjectSwitcher`:

```tsx
import { ProjectSwitcher } from "@/components/ProjectSwitcher"

// In the component, replace SidebarHeader content:
<SidebarHeader>
  <ProjectSwitcher />
</SidebarHeader>
```

Remove the old logo Link and Sparkles icon from the header.

**Step 2: Run typecheck and dev server visual check**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(sidebar): replace logo header with ProjectSwitcher"
```

---

## Task 11: Update React Query hooks to use projectPath

**Files:**
- Modify: `src/hooks/use-config.ts`

**Step 1: Import useProjectContext and update all hooks**

Every hook that queries project-scoped data needs to:
1. Call `useProjectContext()` to get `activeProjectPath`
2. Include `activeProjectPath` in the query key
3. Pass `projectPath` to the server function

Example for `useOverview`:

```typescript
export function useOverview() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: ["overview", activeProjectPath],
    queryFn: async () => {
      const { getOverview } = await import("@/server/overview")
      return getOverview({ data: { projectPath: activeProjectPath } })
    },
    ...REFETCH_OPTIONS,
  })
}
```

Apply the same pattern to: `useClaudeMd`, `useMcpServers`, `useAgentFiles`.

Note: `usePlugins` and `useCliStatus` are global-only, so they don't need projectPath.

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/use-config.ts
git commit -m "feat(hooks): pass activeProjectPath to all project-scoped queries"
```

---

## Task 12: Update CLAUDE.md page for recursive file listing

**Files:**
- Modify: `src/routes/claude-md.tsx`
- Create: `src/hooks/use-claude-md-files.ts`

**Step 1: Create useClaudeMdFiles hook**

Create `src/hooks/use-claude-md-files.ts`:

```typescript
import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"

export function useClaudeMdFiles() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: ["claude-md-files", activeProjectPath],
    queryFn: async () => {
      if (!activeProjectPath) return []
      const { scanClaudeMdFilesFn } = await import("@/server/projects")
      return scanClaudeMdFilesFn({ data: { projectPath: activeProjectPath } })
    },
    enabled: !!activeProjectPath,
  })
}
```

**Step 2: Update claude-md.tsx**

Replace the 2-tab layout with a Collapsible tree layout:
- Global section: always show `~/.claude/CLAUDE.md` (existing `ClaudeMdEditor` with scope="global")
- Project section: show all discovered CLAUDE.md files using `useClaudeMdFiles()`
- Each file clickable to open in the existing textarea editor
- Use Collapsible component for expand/collapse

Reference the shadcn `sidebar-11` Collapsible + ChevronRight pattern for the tree UI.

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/hooks/use-claude-md-files.ts src/routes/claude-md.tsx
git commit -m "feat(claude-md): recursive CLAUDE.md file listing with collapsible tree"
```

---

## Task 13: Integration testing and final verification

**Files:**
- Modify or create integration tests as needed

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

**Step 2: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS

**Step 3: Run build**

Run: `pnpm build`
Expected: PASS

**Step 4: Manual smoke test**

Run: `pnpm dev`

Verify:
1. Sidebar header shows ProjectSwitcher (dropdown with "Global Only")
2. Click "Add Project" → dialog opens → enter a valid path → project appears in list
3. Switch between projects → dashboard data updates
4. CLAUDE.md page shows recursive file listing for selected project
5. Switch to "Global Only" → only global settings visible
6. Remove a project from the list

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: integration testing for multi-project support"
```

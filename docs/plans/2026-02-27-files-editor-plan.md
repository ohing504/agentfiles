# Files Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 Files 페이지를 `.claude/` 디렉토리 전체 파일 탐색기 + 읽기 전용 뷰어로 리팩토링한다.

**Architecture:** EDITOR-GUIDE.md 패턴을 따르는 `src/features/files-editor/` feature 모듈. feature-local 서비스(`files-scanner.service.ts`)가 `.claude/` 디렉토리를 재귀 스캔하여 파일 트리를 구성하고, Server Functions → React Query → FileTree + FileViewerPanel UI로 데이터가 흐른다. `/files` 단일 라우트에서 내부 스코프 탭으로 Global/Project를 전환한다.

**Tech Stack:** TypeScript, TanStack Start (createServerFn), React 19, TanStack Query, shadcn/ui (Tree/TreeFolder/TreeFile), Zod, Vitest

**Design Doc:** `docs/plans/2026-02-27-files-editor-design.md`

**Reference Patterns:**
- `src/features/config-editor/` — 스코프 탭 + feature-local service 패턴
- `src/features/hooks-editor/` — Server Functions + queries 패턴
- `src/components/FileViewer.tsx` — 마크다운/코드 뷰어 (재사용)
- `docs/EDITOR-GUIDE.md` — 디렉토리 구조, dynamic import 규칙

---

### Task 1: Service Layer — `files-scanner.service.ts`

`.claude/` 디렉토리를 재귀 스캔하여 파일 트리를 반환하는 서비스.

**Files:**
- Create: `src/features/files-editor/services/files-scanner.service.ts`
- Create: `src/features/files-editor/services/files-scanner.service.test.ts`

**Step 1: Write the failing tests**

```typescript
// files-scanner.service.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  EXCLUDED_NAMES,
  type FileNode,
  isExcluded,
  readFileContent,
  resolveClaudeDir,
  scanClaudeDir,
} from "./files-scanner.service"

describe("files-scanner.service", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "files-scanner-"))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe("resolveClaudeDir", () => {
    it("returns ~/.claude for global scope", () => {
      const result = resolveClaudeDir("global")
      expect(result).toBe(path.join(os.homedir(), ".claude"))
    })

    it("returns <project>/.claude for project scope", () => {
      const result = resolveClaudeDir("project", "/foo/bar")
      expect(result).toBe("/foo/bar/.claude")
    })
  })

  describe("isExcluded", () => {
    it("excludes cache directories", () => {
      expect(isExcluded("cache")).toBe(true)
    })

    it("excludes .DS_Store", () => {
      expect(isExcluded(".DS_Store")).toBe(true)
    })

    it("excludes .db files", () => {
      expect(isExcluded("data.db")).toBe(true)
    })

    it("allows normal files", () => {
      expect(isExcluded("CLAUDE.md")).toBe(false)
      expect(isExcluded("settings.json")).toBe(false)
    })
  })

  describe("scanClaudeDir", () => {
    it("returns empty children for non-existent dir", async () => {
      const result = await scanClaudeDir("project", "/nonexistent/path")
      expect(result.type).toBe("directory")
      expect(result.children).toEqual([])
    })

    it("scans directory tree structure", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "agents"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "# Test")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "{}")
      await fs.writeFile(path.join(claudeDir, "agents", "commit.md"), "---")

      const result = await scanClaudeDir("project", tmpDir)
      expect(result.type).toBe("directory")
      expect(result.name).toBe(".claude")
      expect(result.children).toBeDefined()

      const names = result.children!.map((c) => c.name).sort()
      expect(names).toContain("CLAUDE.md")
      expect(names).toContain("settings.json")
      expect(names).toContain("agents")

      const agentsDir = result.children!.find((c) => c.name === "agents")
      expect(agentsDir?.type).toBe("directory")
      expect(agentsDir?.children?.length).toBe(1)
      expect(agentsDir?.children?.[0].name).toBe("commit.md")
    })

    it("excludes cache directories", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "plugins", "cache"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "test")
      await fs.writeFile(path.join(claudeDir, "plugins", "cache", "big.js"), "x")

      const result = await scanClaudeDir("project", tmpDir)
      const pluginsDir = result.children!.find((c) => c.name === "plugins")
      // plugins dir exists but cache inside is excluded
      if (pluginsDir) {
        const cacheDir = pluginsDir.children?.find((c) => c.name === "cache")
        expect(cacheDir).toBeUndefined()
      }
    })

    it("sorts directories first, then files alphabetically", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "agents"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "a")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "b")

      const result = await scanClaudeDir("project", tmpDir)
      const types = result.children!.map((c) => c.type)
      const dirIdx = types.indexOf("directory")
      const fileIdx = types.indexOf("file")
      expect(dirIdx).toBeLessThan(fileIdx)
    })
  })

  describe("readFileContent", () => {
    it("reads file content and metadata", async () => {
      const filePath = path.join(tmpDir, "test.md")
      await fs.writeFile(filePath, "# Hello World")

      const result = await readFileContent(filePath)
      expect(result.content).toBe("# Hello World")
      expect(result.size).toBeGreaterThan(0)
      expect(result.lastModified).toBeDefined()
    })

    it("throws for non-existent file", async () => {
      await expect(readFileContent("/no/such/file")).rejects.toThrow()
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/files-editor/services/files-scanner.service.test.ts`
Expected: FAIL (module not found)

**Step 3: Write the implementation**

```typescript
// files-scanner.service.ts
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileNode[]
  size?: number
  extension?: string
}

export interface FileContent {
  content: string
  size: number
  lastModified: string
}

/** Names/patterns to exclude from the file tree. */
export const EXCLUDED_NAMES = new Set([
  "cache",
  "teams",
  "tasks",
  ".DS_Store",
  "Thumbs.db",
  "installed_plugins.json",
])

const EXCLUDED_EXTENSIONS = new Set([".db", ".lock", ".log"])

export function isExcluded(name: string): boolean {
  if (EXCLUDED_NAMES.has(name)) return true
  const ext = path.extname(name).toLowerCase()
  if (EXCLUDED_EXTENSIONS.has(ext)) return true
  if (name.startsWith(".") && name !== ".claude") return true
  return false
}

export function resolveClaudeDir(
  scope: "global" | "project",
  projectPath?: string,
): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".claude")
  }
  return path.join(projectPath ?? process.cwd(), ".claude")
}

export async function scanClaudeDir(
  scope: "global" | "project",
  projectPath?: string,
): Promise<FileNode> {
  const dirPath = resolveClaudeDir(scope, projectPath)
  const rootName = ".claude"

  try {
    await fs.access(dirPath)
  } catch {
    return { name: rootName, path: dirPath, type: "directory", children: [] }
  }

  return scanDir(dirPath, rootName)
}

async function scanDir(dirPath: string, name: string): Promise<FileNode> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  const children: FileNode[] = []
  for (const entry of entries) {
    if (isExcluded(entry.name)) continue

    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const child = await scanDir(entryPath, entry.name)
      children.push(child)
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      const stat = await fs.stat(entryPath)
      children.push({
        name: entry.name,
        path: entryPath,
        type: "file",
        size: stat.size,
        extension: path.extname(entry.name).toLowerCase() || undefined,
      })
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { name, path: dirPath, type: "directory", children }
}

export async function readFileContent(filePath: string): Promise<FileContent> {
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, "utf-8"),
    fs.stat(filePath),
  ])

  return {
    content,
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/files-editor/services/files-scanner.service.test.ts`
Expected: PASS (all tests)

**Step 5: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 6: Commit**

```bash
git add src/features/files-editor/services/
git commit -m "feat(files): add files-scanner service with directory tree scanning"
```

---

### Task 2: Constants & i18n

파일 확장자 아이콘 매핑, 스코프 타입, i18n 키 추가.

**Files:**
- Create: `src/features/files-editor/constants.ts`
- Modify: `messages/en.json`
- Modify: `messages/ko.json`

**Step 1: Create constants**

```typescript
// constants.ts
import type { FileTextIcon, CodeIcon, FileJsonIcon, FileIcon, SettingsIcon } from "lucide-react"

export type FilesScope = "global" | "project"
export const DEFAULT_SCOPE: FilesScope = "global"

/**
 * Map file extensions to lucide-react icon names.
 * Used by FileTree to display appropriate icons.
 */
export const EXTENSION_ICONS: Record<string, string> = {
  ".md": "FileText",
  ".json": "FileJson",
  ".ts": "Code",
  ".js": "Code",
  ".tsx": "Code",
  ".jsx": "Code",
  ".yaml": "FileText",
  ".yml": "FileText",
  ".txt": "FileText",
}

/** Well-known .claude/ file/dir descriptions */
export const KNOWN_ITEMS: Record<string, string> = {
  "CLAUDE.md": "Project instructions",
  "settings.json": "User settings",
  "settings.local.json": "Local settings (git-ignored)",
  agents: "Sub-agent definitions",
  commands: "Slash commands",
  skills: "Reusable skills",
  plugins: "Installed plugins",
  docs: "Custom documentation",
}
```

**Step 2: Add i18n keys to `messages/en.json`**

Add after existing `config_delete_error` key:

```json
"files_title": "Files",
"files_docs": "Docs",
"files_docs_url": "https://code.claude.com/docs/en/settings#configuration-file-locations",
"files_no_selection": "Select a file to view",
"files_no_selection_desc": "Browse the .claude/ directory tree on the left",
"files_empty_dir": "Directory is empty or does not exist",
"files_scope_global": "Global",
"files_scope_project": "Project",
"files_render_error": "Failed to load Files explorer",
"files_open_vscode": "VSCode",
"files_open_cursor": "Cursor"
```

**Step 3: Add i18n keys to `messages/ko.json`**

```json
"files_title": "파일",
"files_docs": "문서",
"files_docs_url": "https://code.claude.com/docs/en/settings#configuration-file-locations",
"files_no_selection": "파일을 선택하세요",
"files_no_selection_desc": "왼쪽의 .claude/ 디렉토리 트리를 탐색하세요",
"files_empty_dir": "디렉토리가 비어있거나 존재하지 않습니다",
"files_scope_global": "글로벌",
"files_scope_project": "프로젝트",
"files_render_error": "파일 탐색기를 불러올 수 없습니다",
"files_open_vscode": "VSCode",
"files_open_cursor": "Cursor"
```

**Step 4: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 5: Commit**

```bash
git add src/features/files-editor/constants.ts messages/en.json messages/ko.json
git commit -m "feat(files): add constants and i18n keys for files-editor"
```

---

### Task 3: Server Functions — `files.functions.ts`

Server Function 래퍼 (EDITOR-GUIDE 동적 import 패턴).

**Files:**
- Create: `src/features/files-editor/api/files.functions.ts`

**Step 1: Write server functions**

```typescript
// files.functions.ts
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const filesScopeSchema = z.enum(["global", "project"])

export const getFileTreeFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: filesScopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { scanClaudeDir } = await import(
      "../services/files-scanner.service"
    )
    return scanClaudeDir(data.scope, data.projectPath)
  })

export const getFileContentFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      filePath: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    // Validate the path is within allowed directories
    const { readFileContent } = await import(
      "../services/files-scanner.service"
    )
    return readFileContent(data.filePath)
  })
```

**Step 2: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 3: Commit**

```bash
git add src/features/files-editor/api/files.functions.ts
git commit -m "feat(files): add server functions for file tree and content"
```

---

### Task 4: React Query Hooks — `files.queries.ts`

Feature-local query keys + hooks.

**Files:**
- Create: `src/features/files-editor/api/files.queries.ts`

**Step 1: Write queries**

```typescript
// files.queries.ts
import { useQuery } from "@tanstack/react-query"
import { useProjectContext } from "@/components/ProjectContext"
import { INFREQUENT_REFETCH } from "@/hooks/use-config"
import type { FilesScope } from "../constants"
import { getFileContentFn, getFileTreeFn } from "./files.functions"

// ── Feature-local query keys ──

export const fileKeys = {
  all: ["files-explorer"] as const,
  tree: (scope: FilesScope, projectPath?: string) =>
    [...fileKeys.all, "tree", scope, projectPath] as const,
  content: (filePath: string) =>
    [...fileKeys.all, "content", filePath] as const,
}

// ── Queries ──

export function useFileTreeQuery(scope: FilesScope) {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: fileKeys.tree(scope, scope === "project" ? activeProjectPath : undefined),
    queryFn: () =>
      getFileTreeFn({
        data: {
          scope,
          projectPath: activeProjectPath,
        },
      }),
    ...INFREQUENT_REFETCH,
  })
}

export function useFileContentQuery(filePath: string | null) {
  return useQuery({
    queryKey: fileKeys.content(filePath ?? ""),
    queryFn: () => getFileContentFn({ data: { filePath: filePath! } }),
    enabled: !!filePath,
    ...INFREQUENT_REFETCH,
  })
}
```

**Step 2: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 3: Commit**

```bash
git add src/features/files-editor/api/files.queries.ts
git commit -m "feat(files): add React Query hooks for file tree and content"
```

---

### Task 5: FilesContext

스코프 + 선택 파일 경로 상태 관리.

**Files:**
- Create: `src/features/files-editor/context/FilesContext.tsx`

**Step 1: Write context**

```tsx
// FilesContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { type FilesScope, DEFAULT_SCOPE } from "../constants"

export interface FilesContextValue {
  scope: FilesScope
  setScope: (scope: FilesScope) => void
  selectedPath: string | null
  setSelectedPath: (path: string | null) => void
}

const FilesCtx = createContext<FilesContextValue | null>(null)

export function useFilesSelection(): FilesContextValue {
  const ctx = useContext(FilesCtx)
  if (!ctx) {
    throw new Error("useFilesSelection must be used within FilesProvider")
  }
  return ctx
}

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeRaw] = useState<FilesScope>(DEFAULT_SCOPE)
  const [selectedPath, setSelectedPathRaw] = useState<string | null>(null)

  const setScope = useCallback((s: FilesScope) => {
    setScopeRaw(s)
    setSelectedPathRaw(null) // Clear selection on scope change
  }, [])

  const setSelectedPath = useCallback(
    (p: string | null) => setSelectedPathRaw(p),
    [],
  )

  const value = useMemo(
    () => ({ scope, setScope, selectedPath, setSelectedPath }),
    [scope, setScope, selectedPath, setSelectedPath],
  )

  return <FilesCtx.Provider value={value}>{children}</FilesCtx.Provider>
}
```

**Step 2: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 3: Commit**

```bash
git add src/features/files-editor/context/FilesContext.tsx
git commit -m "feat(files): add FilesContext for scope and selection state"
```

---

### Task 6: UI Components — FilesPage, FilesPageContent, FilesScopeTabs, FileTree, FileViewerPanel

5개 컴포넌트를 한번에 작성. 각 feature editor의 패턴을 따름.

**Files:**
- Create: `src/features/files-editor/components/FilesPage.tsx`
- Create: `src/features/files-editor/components/FilesPageContent.tsx`
- Create: `src/features/files-editor/components/FilesScopeTabs.tsx`
- Create: `src/features/files-editor/components/FileTree.tsx`
- Create: `src/features/files-editor/components/FileViewerPanel.tsx`

**Step 1: FilesPage (ErrorBoundary + Provider)**

```tsx
// FilesPage.tsx
import { AlertTriangleIcon } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { m } from "@/paraglide/messages"
import { FilesProvider } from "../context/FilesContext"
import { FilesPageContent } from "./FilesPageContent"

function FilesErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangleIcon className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">{m.files_render_error()}</p>
      </div>
    </div>
  )
}

export function FilesPage() {
  return (
    <ErrorBoundary fallback={<FilesErrorFallback />}>
      <FilesProvider>
        <FilesPageContent />
      </FilesProvider>
    </ErrorBoundary>
  )
}
```

**Step 2: FilesScopeTabs**

```tsx
// FilesScopeTabs.tsx
import { memo } from "react"
import { m } from "@/paraglide/messages"
import type { FilesScope } from "../constants"

interface FilesScopeTabsProps {
  scope: FilesScope
  onScopeChange: (scope: FilesScope) => void
  hasProject: boolean
}

const SCOPES: { id: FilesScope; labelKey: "files_scope_global" | "files_scope_project" }[] = [
  { id: "global", labelKey: "files_scope_global" },
  { id: "project", labelKey: "files_scope_project" },
]

export const FilesScopeTabs = memo(function FilesScopeTabs({
  scope,
  onScopeChange,
  hasProject,
}: FilesScopeTabsProps) {
  return (
    <div className="flex border-b border-border">
      {SCOPES.map((s) => {
        const disabled = s.id === "project" && !hasProject
        return (
          <button
            key={s.id}
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              scope === s.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() => !disabled && onScopeChange(s.id)}
            disabled={disabled}
            aria-label={`${s.id} scope`}
          >
            {m[s.labelKey]()}
          </button>
        )
      })}
    </div>
  )
})
```

**Step 3: FileTree**

```tsx
// FileTree.tsx
import {
  FileIcon,
  FileJsonIcon,
  FileTextIcon,
  FolderIcon,
} from "lucide-react"
import { memo } from "react"
import type { FileNode } from "../services/files-scanner.service"

interface FileTreeProps {
  root: FileNode
  selectedPath: string | null
  onSelect: (path: string) => void
}

function getFileIcon(extension?: string) {
  switch (extension) {
    case ".md":
      return FileTextIcon
    case ".json":
      return FileJsonIcon
    default:
      return FileIcon
  }
}

const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 1)

  if (node.type === "directory") {
    return (
      <div>
        <button
          type="button"
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/50 rounded-sm transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setOpen(!open)}
        >
          <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              defaultOpen={depth < 0}
            />
          ))}
      </div>
    )
  }

  const Icon = getFileIcon(node.extension)
  const isSelected = selectedPath === node.path

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded-sm transition-colors ${
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50 text-foreground"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(node.path)}
    >
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  )
})

// Need useState import
import { useState } from "react"

export const FileTree = memo(function FileTree({
  root,
  selectedPath,
  onSelect,
}: FileTreeProps) {
  if (!root.children || root.children.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        {/* empty state handled by parent */}
      </div>
    )
  }

  return (
    <div className="py-1">
      {root.children.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          defaultOpen
        />
      ))}
    </div>
  )
})
```

**Step 4: FileViewerPanel**

```tsx
// FileViewerPanel.tsx
import { ExternalLinkIcon, FolderOpenIcon } from "lucide-react"
import { toast } from "sonner"
import { FileViewer } from "@/components/FileViewer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useFileContentQuery } from "../api/files.queries"

interface FileViewerPanelProps {
  filePath: string | null
}

export function FileViewerPanel({ filePath }: FileViewerPanelProps) {
  const { data, isLoading } = useFileContentQuery(filePath)

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-1">
          <FolderOpenIcon className="size-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            {m.files_no_selection()}
          </p>
          <p className="text-xs text-muted-foreground">
            {m.files_no_selection_desc()}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  const fileName = filePath.split("/").pop() ?? ""
  const isMarkdown = fileName.endsWith(".md")

  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {fileName}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <ExternalLinkIcon className="size-3" />
              Open in...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              {m.files_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              {m.files_open_cursor()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content viewer */}
      <div className="flex-1 overflow-y-auto p-4">
        {data && (
          <FileViewer
            rawContent={data.content}
            fileName={fileName}
            isMarkdown={isMarkdown}
          />
        )}
      </div>
    </div>
  )
}
```

**Step 5: FilesPageContent**

```tsx
// FilesPageContent.tsx
import { ExternalLinkIcon } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useFileTreeQuery } from "../api/files.queries"
import { useFilesSelection } from "../context/FilesContext"
import { FilesScopeTabs } from "./FilesScopeTabs"
import { FileTree } from "./FileTree"
import { FileViewerPanel } from "./FileViewerPanel"

export function FilesPageContent() {
  const { activeProjectPath } = useProjectContext()
  const { scope, setScope, selectedPath, setSelectedPath } = useFilesSelection()
  const { data: tree, isLoading } = useFileTreeQuery(scope)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold">{m.files_title()}</h2>
        <a
          href={m.files_docs_url()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {m.files_docs()}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>

      {/* Scope tabs */}
      <div className="shrink-0 px-4 pb-2">
        <FilesScopeTabs
          scope={scope}
          onScopeChange={setScope}
          hasProject={!!activeProjectPath}
        />
      </div>

      {/* Tree + Viewer */}
      <div className="flex flex-1 min-h-0">
        {/* Left: File tree */}
        <div className="w-[280px] shrink-0 border-r border-border overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : tree ? (
            <FileTree
              root={tree}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
              {m.files_empty_dir()}
            </div>
          )}
        </div>

        {/* Right: File viewer */}
        <FileViewerPanel filePath={selectedPath} />
      </div>
    </div>
  )
}
```

**Step 6: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 7: Commit**

```bash
git add src/features/files-editor/components/
git commit -m "feat(files): add UI components — page, scope tabs, tree, viewer"
```

---

### Task 7: Route Wiring & Sidebar Cleanup

라우트를 `/files` 단일로 통합하고, 사이드바에서 Global/Project 그룹 제거.

**Files:**
- Modify: `src/routes/files/route.tsx` — FilesPage로 교체 (리다이렉트 제거)
- Modify: `src/routes/global/files/route.tsx` — `/files`로 리다이렉트
- Modify: `src/routes/project/files/route.tsx` — `/files`로 리다이렉트
- Modify: `src/components/layout/Sidebar.tsx` — Files top-level 추가, Global/Project 그룹 제거

**Step 1: Update `/files` route**

```tsx
// src/routes/files/route.tsx
import { createFileRoute } from "@tanstack/react-router"
import { FilesPage } from "@/features/files-editor/components/FilesPage"

export const Route = createFileRoute("/files")({
  component: () => <FilesPage />,
})
```

**Step 2: Redirect `/global/files` and `/project/files` to `/files`**

```tsx
// src/routes/global/files/route.tsx
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/global/files")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})
```

```tsx
// src/routes/project/files/route.tsx
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/project/files")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})
```

**Step 3: Update Sidebar**

In `src/components/layout/Sidebar.tsx`:

1. "Files" 항목을 top-level 메뉴에 추가 (Configuration 아래)
2. `globalNavItems`, `projectNavItems` 배열 제거 (빈 배열이 되므로)
3. Global/Project 그룹 JSX 전체 제거
4. `SidebarGroupLabel` import 제거
5. `useProjectContext` import 제거 (더 이상 사용 안 함)

Top-level 메뉴에 추가:

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild tooltip={m.nav_files()}>
    <Link to="/files" activeProps={{ "data-active": true }}>
      <FolderOpen />
      <span>{m.nav_files()}</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Step 4: Run quality checks**

Run: `pnpm typecheck && pnpm lint`

**Step 5: Commit**

```bash
git add src/routes/ src/components/layout/Sidebar.tsx
git commit -m "refactor(files): wire /files route, cleanup sidebar Global/Project groups"
```

---

### Task 8: Legacy Cleanup

기존 FilesPageContent 삭제, 사용되지 않는 훅 정리, EDITOR-GUIDE 업데이트.

**Files:**
- Delete: `src/components/pages/FilesPageContent.tsx`
- Modify: `docs/EDITOR-GUIDE.md` — files-editor 의존성 규칙 추가
- Modify: `docs/WORK.md` — files-editor 완료 기록

**Step 1: Delete old FilesPageContent**

```bash
rm src/components/pages/FilesPageContent.tsx
```

**Step 2: Check for remaining imports of deleted file**

Run: `grep -r "FilesPageContent" src/ --include="*.ts" --include="*.tsx"`

Expected: Only the redirect routes (which no longer import it). If any imports remain, fix them.

**Step 3: Check if `useAgentFiles`, `useClaudeMdGlobalMeta`, `useClaudeMdFiles` are still used elsewhere**

Run:
```bash
grep -r "useAgentFiles\|useClaudeMdGlobalMeta\|useClaudeMdFiles" src/ --include="*.ts" --include="*.tsx"
```

If only in `use-config.ts` / `use-claude-md-files.ts` definition (no consumers), remove them. If Dashboard or other pages still use them, keep.

**Step 4: Update EDITOR-GUIDE.md**

Add files-editor to the dependency rules section:

```markdown
files-editor  ──→ 다른 feature      ❌ 금지 (독립)
다른 feature   ──→ files-editor     ❌ 금지 (독립)
```

Add files-editor structure documentation (like config-editor section).

**Step 5: Update WORK.md** — Add files-editor to Shipped section.

**Step 6: Run all quality checks**

Run: `pnpm typecheck && pnpm lint && pnpm test`

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(files): remove legacy FilesPageContent, update docs"
```

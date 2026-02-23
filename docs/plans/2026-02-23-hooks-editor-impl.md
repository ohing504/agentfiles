# Hooks Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hooks 에디터 페이지를 구현하여 사용자가 GUI로 Claude Code hooks를 관리할 수 있도록 한다.

**Architecture:** settings.json의 hooks 섹션을 직접 읽고/쓰는 HooksService를 만들고, Server Functions로 노출한 뒤, React Query 훅으로 프론트엔드에 연결한다. 페이지는 2-panel 레이아웃(좌측 목록 + 우측 상세)으로 구성하며, 기존 Files 페이지 패턴을 따른다.

**Tech Stack:** TypeScript, TanStack Start (createServerFn), React 19, TanStack Query, shadcn/ui, Tailwind CSS v4, Vitest

**Design Doc:** `docs/plans/2026-02-23-hooks-editor-design.md`

---

### Task 1: Hook 타입 정의

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: types.ts에 Hook 타입 추가**

`src/shared/types.ts` 파일 하단에 다음 타입들을 추가:

```typescript
// ── Hooks ──
export type HookType = "command" | "prompt" | "agent"

export interface HookEntry {
  type: HookType
  command?: string       // command type
  prompt?: string        // prompt/agent type
  model?: string         // prompt/agent type
  timeout?: number       // seconds
  async?: boolean        // command type only
  statusMessage?: string
  once?: boolean
}

export interface HookMatcherGroup {
  matcher?: string       // regex pattern
  hooks: HookEntry[]
}

export type HookEventName =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PermissionRequest"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Notification"
  | "SubagentStart"
  | "SubagentStop"
  | "Stop"
  | "TeammateIdle"
  | "TaskCompleted"
  | "ConfigChange"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "PreCompact"
  | "SessionEnd"

export type HooksSettings = Partial<Record<HookEventName, HookMatcherGroup[]>>
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(hooks): add Hook type definitions"
```

---

### Task 2: HooksService 구현

**Files:**
- Create: `src/services/hooks-service.ts`
- Create: `tests/services/hooks-service.test.ts`

**Step 1: 테스트 작성**

`tests/services/hooks-service.test.ts`:

```typescript
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// 테스트할 함수들은 실제 파일 시스템 사용
let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hooks-test-"))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("HooksService", () => {
  describe("getHooksFromSettings", () => {
    it("hooks 섹션이 없는 settings.json에서 빈 객체를 반환한다", async () => {
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify({ enabledPlugins: {} }),
      )
      const { getHooksFromSettings } = await import(
        "@/services/hooks-service"
      )
      const result = await getHooksFromSettings(tmpDir)
      expect(result).toEqual({})
    })

    it("hooks 섹션이 있는 settings.json에서 hooks를 파싱한다", async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash",
              hooks: [{ type: "command", command: "echo hello", timeout: 5 }],
            },
          ],
          Stop: [
            {
              hooks: [{ type: "command", command: "pnpm typecheck" }],
            },
          ],
        },
      }
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify(settings),
      )
      const { getHooksFromSettings } = await import(
        "@/services/hooks-service"
      )
      const result = await getHooksFromSettings(tmpDir)
      expect(result.PreToolUse).toHaveLength(1)
      expect(result.PreToolUse![0].matcher).toBe("Bash")
      expect(result.Stop).toHaveLength(1)
    })

    it("settings.json이 없으면 빈 객체를 반환한다", async () => {
      const { getHooksFromSettings } = await import(
        "@/services/hooks-service"
      )
      const result = await getHooksFromSettings(
        path.join(tmpDir, "nonexistent"),
      )
      expect(result).toEqual({})
    })
  })

  describe("saveHooksToSettings", () => {
    it("기존 settings.json에 hooks 섹션만 업데이트한다", async () => {
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify({ enabledPlugins: { foo: true } }),
      )
      const { saveHooksToSettings } = await import(
        "@/services/hooks-service"
      )
      await saveHooksToSettings(tmpDir, {
        Stop: [{ hooks: [{ type: "command", command: "pnpm test" }] }],
      })
      const raw = JSON.parse(
        await fs.readFile(path.join(tmpDir, "settings.json"), "utf-8"),
      )
      expect(raw.enabledPlugins).toEqual({ foo: true })
      expect(raw.hooks.Stop).toHaveLength(1)
    })

    it("hooks가 빈 객체이면 hooks 키를 제거한다", async () => {
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify({
          enabledPlugins: {},
          hooks: { Stop: [{ hooks: [{ type: "command", command: "test" }] }] },
        }),
      )
      const { saveHooksToSettings } = await import(
        "@/services/hooks-service"
      )
      await saveHooksToSettings(tmpDir, {})
      const raw = JSON.parse(
        await fs.readFile(path.join(tmpDir, "settings.json"), "utf-8"),
      )
      expect(raw.hooks).toBeUndefined()
    })
  })

  describe("addHookToSettings", () => {
    it("기존 이벤트에 새 matcher group을 추가한다", async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            { matcher: "Bash", hooks: [{ type: "command", command: "echo" }] },
          ],
        },
      }
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify(settings),
      )
      const { addHookToSettings } = await import("@/services/hooks-service")
      await addHookToSettings(tmpDir, "PreToolUse", {
        matcher: "Edit|Write",
        hooks: [{ type: "command", command: "pnpm lint:fix" }],
      })
      const raw = JSON.parse(
        await fs.readFile(path.join(tmpDir, "settings.json"), "utf-8"),
      )
      expect(raw.hooks.PreToolUse).toHaveLength(2)
    })

    it("새 이벤트에 hook을 추가한다", async () => {
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify({}),
      )
      const { addHookToSettings } = await import("@/services/hooks-service")
      await addHookToSettings(tmpDir, "Stop", {
        hooks: [{ type: "command", command: "pnpm typecheck" }],
      })
      const raw = JSON.parse(
        await fs.readFile(path.join(tmpDir, "settings.json"), "utf-8"),
      )
      expect(raw.hooks.Stop).toHaveLength(1)
    })
  })

  describe("removeHookFromSettings", () => {
    it("특정 hook을 삭제하고 빈 이벤트도 정리한다", async () => {
      const settings = {
        hooks: {
          Stop: [
            { hooks: [{ type: "command", command: "pnpm typecheck" }] },
          ],
        },
      }
      await fs.writeFile(
        path.join(tmpDir, "settings.json"),
        JSON.stringify(settings),
      )
      const { removeHookFromSettings } = await import(
        "@/services/hooks-service"
      )
      await removeHookFromSettings(tmpDir, "Stop", 0, 0)
      const raw = JSON.parse(
        await fs.readFile(path.join(tmpDir, "settings.json"), "utf-8"),
      )
      // Stop 이벤트가 비었으므로 hooks 키 자체가 제거됨
      expect(raw.hooks).toBeUndefined()
    })
  })

  describe("readScriptFile", () => {
    it("스크립트 파일 내용을 읽는다", async () => {
      const scriptPath = path.join(tmpDir, "test.sh")
      await fs.writeFile(scriptPath, "#!/bin/bash\necho hello")
      const { readScriptFile } = await import("@/services/hooks-service")
      const content = await readScriptFile(scriptPath)
      expect(content).toBe("#!/bin/bash\necho hello")
    })

    it("존재하지 않는 파일은 null을 반환한다", async () => {
      const { readScriptFile } = await import("@/services/hooks-service")
      const content = await readScriptFile(path.join(tmpDir, "nope.sh"))
      expect(content).toBeNull()
    })
  })
})
```

**Step 2: 테스트 실패 확인**

Run: `pnpm test tests/services/hooks-service.test.ts`
Expected: FAIL (모듈 없음)

**Step 3: HooksService 구현**

`src/services/hooks-service.ts`:

```typescript
import fs from "node:fs/promises"
import path from "node:path"
import type { HookEventName, HookMatcherGroup, HooksSettings } from "@/shared/types"

/**
 * settings.json에서 hooks 섹션을 읽어온다.
 */
export async function getHooksFromSettings(
  basePath: string,
): Promise<HooksSettings> {
  const settingsPath = path.join(basePath, "settings.json")
  try {
    const content = await fs.readFile(settingsPath, "utf-8")
    const settings = JSON.parse(content) as Record<string, unknown>
    return (settings.hooks as HooksSettings) ?? {}
  } catch {
    return {}
  }
}

/**
 * settings.json의 hooks 섹션을 교체 저장한다.
 * 다른 키(enabledPlugins, mcpServers 등)는 유지한다.
 */
export async function saveHooksToSettings(
  basePath: string,
  hooks: HooksSettings,
): Promise<void> {
  const settingsPath = path.join(basePath, "settings.json")
  let settings: Record<string, unknown> = {}
  try {
    const content = await fs.readFile(settingsPath, "utf-8")
    settings = JSON.parse(content) as Record<string, unknown>
  } catch {
    // 파일 없으면 새로 생성
  }

  const hasHooks = Object.keys(hooks).length > 0
  if (hasHooks) {
    settings.hooks = hooks
  } else {
    delete settings.hooks
  }

  await fs.mkdir(basePath, { recursive: true })
  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8")
}

/**
 * 특정 이벤트에 새 matcher group을 추가한다.
 */
export async function addHookToSettings(
  basePath: string,
  event: HookEventName,
  matcherGroup: HookMatcherGroup,
): Promise<void> {
  const hooks = await getHooksFromSettings(basePath)
  const groups = hooks[event] ?? []
  groups.push(matcherGroup)
  hooks[event] = groups
  await saveHooksToSettings(basePath, hooks)
}

/**
 * 특정 hook을 삭제한다.
 * group 내 hook이 비면 group 삭제, event 내 group이 비면 event 삭제.
 */
export async function removeHookFromSettings(
  basePath: string,
  event: HookEventName,
  groupIndex: number,
  hookIndex: number,
): Promise<void> {
  const hooks = await getHooksFromSettings(basePath)
  const groups = hooks[event]
  if (!groups || !groups[groupIndex]) return

  groups[groupIndex].hooks.splice(hookIndex, 1)

  // group의 hooks가 비었으면 group 삭제
  if (groups[groupIndex].hooks.length === 0) {
    groups.splice(groupIndex, 1)
  }

  // event의 groups가 비었으면 event 삭제
  if (groups.length === 0) {
    delete hooks[event]
  }

  await saveHooksToSettings(basePath, hooks)
}

/**
 * 스크립트 파일 내용을 읽는다 (미리보기용).
 */
export async function readScriptFile(
  filePath: string,
): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8")
  } catch {
    return null
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm test tests/services/hooks-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/hooks-service.ts tests/services/hooks-service.test.ts
git commit -m "feat(hooks): add HooksService with tests"
```

---

### Task 3: Server Functions 구현

**Files:**
- Create: `src/server/hooks.ts`

**Step 1: Server Functions 작성**

`src/server/hooks.ts`:

```typescript
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const scopeSchema = z.enum(["global", "project"])

const hookEntrySchema = z.object({
  type: z.enum(["command", "prompt", "agent"]),
  command: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  timeout: z.number().optional(),
  async: z.boolean().optional(),
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),
})

const matcherGroupSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(hookEntrySchema).min(1),
})

const hookEventNameSchema = z.enum([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Notification",
  "SubagentStart",
  "SubagentStop",
  "Stop",
  "TeammateIdle",
  "TaskCompleted",
  "ConfigChange",
  "WorktreeCreate",
  "WorktreeRemove",
  "PreCompact",
  "SessionEnd",
])

export const getHooksFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { getHooksFromSettings } = await import("@/services/hooks-service")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    return getHooksFromSettings(basePath)
  })

export const addHookFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: scopeSchema,
      event: hookEventNameSchema,
      matcherGroup: matcherGroupSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { addHookToSettings } = await import("@/services/hooks-service")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    await addHookToSettings(basePath, data.event, data.matcherGroup)
    return { success: true }
  })

export const removeHookFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: scopeSchema,
      event: hookEventNameSchema,
      groupIndex: z.number().int().min(0),
      hookIndex: z.number().int().min(0),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { removeHookFromSettings } = await import("@/services/hooks-service")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    await removeHookFromSettings(
      basePath,
      data.event,
      data.groupIndex,
      data.hookIndex,
    )
    return { success: true }
  })

export const readScriptFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      filePath: z.string().min(1),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const path = await import("node:path")
    const { getProjectConfigPath } = await import("@/services/config-service")

    // 상대 경로나 $CLAUDE_PROJECT_DIR 포함 경로 처리
    let resolvedPath = data.filePath
    if (data.projectPath) {
      resolvedPath = resolvedPath.replace(
        /\$CLAUDE_PROJECT_DIR|\"\$CLAUDE_PROJECT_DIR\"/g,
        data.projectPath,
      )
    }
    if (!path.isAbsolute(resolvedPath) && data.projectPath) {
      resolvedPath = path.join(data.projectPath, resolvedPath)
    }

    const { readScriptFile } = await import("@/services/hooks-service")
    return { content: await readScriptFile(resolvedPath) }
  })
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/server/hooks.ts
git commit -m "feat(hooks): add server functions for hooks CRUD"
```

---

### Task 4: Query Keys + React Hook

**Files:**
- Modify: `src/lib/query-keys.ts`
- Modify: `src/hooks/use-config.ts`

**Step 1: Query Keys 추가**

`src/lib/query-keys.ts`에 hooks 키 추가 (claudeAppJson 위):

```typescript
hooks: {
  all: ["hooks"] as const,
  byScope: (scope: Scope, projectPath?: string) =>
    [...queryKeys.hooks.all, scope, projectPath] as const,
},
```

**Step 2: useHooks React Hook 추가**

`src/hooks/use-config.ts` 하단에 추가:

```typescript
// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useHooks(scope: Scope) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.hooks.byScope(
      scope,
      scope === "project" ? activeProjectPath : undefined,
    ),
    queryFn: async () => {
      const { getHooksFn } = await import("@/server/hooks")
      return getHooksFn({
        data: { scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const addMutation = useMutation({
    mutationFn: async (params: {
      event: string
      matcherGroup: { matcher?: string; hooks: Array<Record<string, unknown>> }
    }) => {
      const { addHookFn } = await import("@/server/hooks")
      return addHookFn({
        data: {
          scope,
          event: params.event as import("@/shared/types").HookEventName,
          matcherGroup: params.matcherGroup as import("@/shared/types").HookMatcherGroup,
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
      event: string
      groupIndex: number
      hookIndex: number
    }) => {
      const { removeHookFn } = await import("@/server/hooks")
      return removeHookFn({
        data: {
          scope,
          event: params.event as import("@/shared/types").HookEventName,
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

**Step 3: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/query-keys.ts src/hooks/use-config.ts
git commit -m "feat(hooks): add query keys and useHooks React hook"
```

---

### Task 5: 라우트 + 사이드바

**Files:**
- Create: `src/routes/hooks.tsx`
- Modify: `src/components/Sidebar.tsx`

**Step 1: Hooks 라우트 생성**

`src/routes/hooks.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router"
import { HooksPageContent } from "@/components/pages/HooksPageContent"

export const Route = createFileRoute("/hooks")({
  component: HooksPageContent,
})
```

**Step 2: 사이드바에 Hooks 메뉴 추가**

`src/components/Sidebar.tsx`에서:

1. import에 `Zap` 추가:
```typescript
import {
  FolderOpen,
  LayoutDashboard,
  PanelLeftIcon,
  Puzzle,
  Server,
  Settings,
  Zap,
} from "lucide-react"
```

2. Dashboard SidebarGroup 아래, Global SidebarGroup 위에 Hooks 메뉴 추가:
```tsx
{/* Hooks */}
<SidebarGroup>
  <SidebarGroupContent>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Hooks">
          <Link
            to="/hooks"
            activeProps={{ "data-active": true }}
          >
            <Zap />
            <span>Hooks</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

**Step 3: HooksPageContent 빈 컴포넌트 작성 (컴파일용)**

`src/components/pages/HooksPageContent.tsx`:

```typescript
export function HooksPageContent() {
  return <div>Hooks (WIP)</div>
}
```

**Step 4: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/hooks.tsx src/components/Sidebar.tsx src/components/pages/HooksPageContent.tsx
git commit -m "feat(hooks): add /hooks route and sidebar entry"
```

---

### Task 6: 좌측 패널 (Hook 목록 트리)

**Files:**
- Modify: `src/components/pages/HooksPageContent.tsx`

**Step 1: 좌측 패널 구현**

`src/components/pages/HooksPageContent.tsx`를 전면 교체:

```tsx
import { useQuery } from "@tanstack/react-query"
import {
  AlertCircle,
  FileCode,
  MessageSquare,
  Plus,
  Search,
  Zap,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useHooks } from "@/hooks/use-config"
import { queryKeys } from "@/lib/query-keys"
import type {
  HookEntry,
  HookEventName,
  HookMatcherGroup,
  HooksSettings,
  Scope,
} from "@/shared/types"

// ── Hook 이름 추출 ──────────────────────────────────────────────────────────

function getHookDisplayName(hook: HookEntry): string {
  if (hook.type === "command" && hook.command) {
    // 파일 경로에서 파일명 추출
    const cmd = hook.command
      .replace(/"\$CLAUDE_PROJECT_DIR"\//g, "")
      .replace(/\$CLAUDE_PROJECT_DIR\//g, "")
    const parts = cmd.split("/")
    const last = parts[parts.length - 1]
    // 인라인 명령어는 짧게 truncate
    if (parts.length === 1 && cmd.length > 30) {
      return `${cmd.slice(0, 27)}...`
    }
    return last
  }
  if ((hook.type === "prompt" || hook.type === "agent") && hook.prompt) {
    return hook.prompt.length > 30
      ? `${hook.prompt.slice(0, 27)}...`
      : hook.prompt
  }
  return hook.type
}

function getHookIcon(hook: HookEntry) {
  switch (hook.type) {
    case "command":
      return FileCode
    case "prompt":
      return MessageSquare
    case "agent":
      return Zap
    default:
      return FileCode
  }
}

// ── Selected hook 타입 ──────────────────────────────────────────────────────

interface SelectedHook {
  scope: Scope
  event: HookEventName
  groupIndex: number
  hookIndex: number
  hook: HookEntry
  matcher?: string
}

// ── Scope Section ───────────────────────────────────────────────────────────

function HooksScopeSection({
  label,
  hooks,
  scope,
  selectedHook,
  onSelect,
  onAdd,
  searchQuery,
}: {
  label: string
  hooks: HooksSettings
  scope: Scope
  selectedHook: SelectedHook | null
  onSelect: (hook: SelectedHook) => void
  onAdd: (scope: Scope) => void
  searchQuery: string
}) {
  const events = Object.entries(hooks) as [HookEventName, HookMatcherGroup[]][]

  // 검색 필터링
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events
    const q = searchQuery.toLowerCase()
    return events
      .map(([event, groups]) => {
        const filteredGroups = groups
          .map((group) => ({
            ...group,
            hooks: group.hooks.filter((hook) => {
              const name = getHookDisplayName(hook).toLowerCase()
              const cmd = (hook.command ?? "").toLowerCase()
              const matcher = (group.matcher ?? "").toLowerCase()
              return name.includes(q) || cmd.includes(q) || matcher.includes(q)
            }),
          }))
          .filter((g) => g.hooks.length > 0)
        return [event, filteredGroups] as [HookEventName, HookMatcherGroup[]]
      })
      .filter(([, groups]) => groups.length > 0)
  }, [events, searchQuery])

  const totalHooks = filteredEvents.reduce(
    (sum, [, groups]) =>
      sum + groups.reduce((gs, g) => gs + g.hooks.length, 0),
    0,
  )

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onAdd(scope)}
          className="rounded p-0.5 hover:bg-muted"
        >
          <Plus className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="border-b border-border mb-1" />
      {totalHooks === 0 ? (
        <p className="px-2 py-2 text-xs text-muted-foreground/60">
          No hooks configured
        </p>
      ) : (
        <Tree>
          {filteredEvents.map(([event, groups]) => {
            const hookCount = groups.reduce((s, g) => s + g.hooks.length, 0)
            return (
              <TreeFolder
                key={event}
                icon={Zap}
                label={event}
                count={hookCount}
                defaultOpen={true}
              >
                {groups.map((group, gi) =>
                  group.hooks.map((hook, hi) => {
                    // 원본 인덱스 계산 (검색 시에도 올바르게)
                    const origGi = (hooks[event] ?? []).indexOf(
                      (hooks[event] ?? []).find(
                        (og) =>
                          og.matcher === group.matcher &&
                          og.hooks.includes(hook),
                      )!,
                    )
                    const origHi = (hooks[event] ?? [])[origGi]?.hooks.indexOf(hook) ?? hi

                    const isSelected =
                      selectedHook?.scope === scope &&
                      selectedHook?.event === event &&
                      selectedHook?.groupIndex === origGi &&
                      selectedHook?.hookIndex === origHi
                    return (
                      <TreeFile
                        key={`${event}-${gi}-${hi}`}
                        icon={getHookIcon(hook)}
                        label={getHookDisplayName(hook)}
                        selected={isSelected}
                        onClick={() =>
                          onSelect({
                            scope,
                            event,
                            groupIndex: origGi,
                            hookIndex: origHi,
                            hook,
                            matcher: group.matcher,
                          })
                        }
                      />
                    )
                  }),
                )}
              </TreeFolder>
            )
          })}
        </Tree>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function HooksPageContent() {
  const { activeProjectPath } = useProjectContext()
  const { query: globalQuery } = useHooks("global")
  const { query: projectQuery } = useHooks("project")

  const [selectedHook, setSelectedHook] = useState<SelectedHook | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogScope, setAddDialogScope] = useState<Scope | null>(null)

  const globalHooks = globalQuery.data ?? {}
  const projectHooks = projectQuery.data ?? {}

  const isLoading = globalQuery.isLoading || projectQuery.isLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Left: Hook tree */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Hooks</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search hooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <HooksScopeSection
          label="Global"
          hooks={globalHooks}
          scope="global"
          selectedHook={selectedHook}
          onSelect={setSelectedHook}
          onAdd={setAddDialogScope}
          searchQuery={searchQuery}
        />
        {activeProjectPath && (
          <HooksScopeSection
            label="Project"
            hooks={projectHooks}
            scope="project"
            selectedHook={selectedHook}
            onSelect={setSelectedHook}
            onAdd={setAddDialogScope}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Right: Detail panel */}
      <div>
        {/* Task 7에서 구현 */}
        {!selectedHook ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Zap className="w-10 h-10 opacity-30" />
            <p className="text-sm">Select a hook to view details</p>
          </div>
        ) : (
          <div className="text-sm">
            <p>
              {selectedHook.event} / {getHookDisplayName(selectedHook.hook)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

주의사항:
- `getHookDisplayName`과 `getHookIcon`은 별도 유틸로 분리하지 않고 컴포넌트 파일 내에 둔다
- `HooksScopeSection` 내부에서 원본 인덱스 추적은 검색 필터링 시 삭제 동작이 올바르게 작동하기 위함

**Step 2: typecheck + lint 확인**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/pages/HooksPageContent.tsx
git commit -m "feat(hooks): implement left panel with hook tree"
```

---

### Task 7: 우측 패널 (Hook 상세 뷰)

**Files:**
- Modify: `src/components/pages/HooksPageContent.tsx`

**Step 1: HookDetailPanel 컴포넌트 구현**

`HooksPageContent.tsx`에 HookDetailPanel 컴포넌트를 추가한다.
기능:
- hook 이름 타이틀 + Delete 버튼
- Type (읽기 전용 표시)
- Matcher (있으면 표시)
- Timeout 표시
- command type: Command 표시 + 파일인 경우 Script Preview
- prompt/agent type: Prompt textarea (읽기 전용) + Model 표시
- Async 표시 (command type만)

```tsx
function HookDetailPanel({
  selectedHook,
  onDelete,
  isDeleting,
}: {
  selectedHook: SelectedHook
  onDelete: () => void
  isDeleting: boolean
}) {
  const { activeProjectPath } = useProjectContext()
  const { hook, event, matcher } = selectedHook

  // 스크립트 미리보기 (command type + 파일 경로인 경우)
  const isFilePath = hook.type === "command" && hook.command
    ? /\.(sh|py|js|ts)(\s|$|")/.test(hook.command) ||
      hook.command.includes("$CLAUDE_PROJECT_DIR") ||
      hook.command.startsWith(".claude/")
    : false

  const scriptQuery = useQuery({
    queryKey: ["hook-script", hook.command, activeProjectPath],
    queryFn: async () => {
      const { readScriptFn } = await import("@/server/hooks")
      return readScriptFn({
        data: { filePath: hook.command!, projectPath: activeProjectPath },
      })
    },
    enabled: isFilePath && !!hook.command,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {getHookDisplayName(hook)}
        </h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="size-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
        <span className="text-muted-foreground">Event</span>
        <Badge variant="outline">{event}</Badge>

        <span className="text-muted-foreground">Type</span>
        <Badge variant="secondary">{hook.type}</Badge>

        {matcher && (
          <>
            <span className="text-muted-foreground">Matcher</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
              {matcher}
            </code>
          </>
        )}

        {hook.timeout != null && (
          <>
            <span className="text-muted-foreground">Timeout</span>
            <span>{hook.timeout}s</span>
          </>
        )}

        {hook.type === "command" && hook.async != null && (
          <>
            <span className="text-muted-foreground">Async</span>
            <span>{hook.async ? "Yes" : "No"}</span>
          </>
        )}
      </div>

      {/* Command / Prompt content */}
      {hook.type === "command" && hook.command && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Command
            </label>
            <pre className="mt-1 rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-all">
              {hook.command}
            </pre>
          </div>

          {/* Script Preview */}
          {isFilePath && scriptQuery.data?.content && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Script Preview
              </label>
              <pre className="mt-1 max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs font-mono whitespace-pre">
                {scriptQuery.data.content}
              </pre>
            </div>
          )}
        </div>
      )}

      {(hook.type === "prompt" || hook.type === "agent") && hook.prompt && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Prompt
            </label>
            <pre className="mt-1 rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap">
              {hook.prompt}
            </pre>
          </div>
          {hook.model && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Model
              </label>
              <p className="mt-1 text-sm">{hook.model}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: HooksPageContent의 우측 패널 교체**

기존 placeholder를 `HookDetailPanel`로 교체. Delete 핸들러 연결:

```tsx
{!selectedHook ? (
  <EmptyState />
) : (
  <HookDetailPanel
    key={`${selectedHook.scope}-${selectedHook.event}-${selectedHook.groupIndex}-${selectedHook.hookIndex}`}
    selectedHook={selectedHook}
    onDelete={handleDelete}
    isDeleting={removeMutation.isPending}
  />
)}
```

Delete handler:
```tsx
const { removeMutation: globalRemove } = useHooks("global")
const { removeMutation: projectRemove } = useHooks("project")

const handleDelete = () => {
  if (!selectedHook) return
  const mutation = selectedHook.scope === "global" ? globalRemove : projectRemove
  mutation.mutate(
    {
      event: selectedHook.event,
      groupIndex: selectedHook.groupIndex,
      hookIndex: selectedHook.hookIndex,
    },
    { onSuccess: () => setSelectedHook(null) },
  )
}
```

추가 import:
```typescript
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
```

**Step 3: typecheck + lint 확인**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/pages/HooksPageContent.tsx
git commit -m "feat(hooks): implement right panel with hook detail view"
```

---

### Task 8: Add Hook Dialog

**Files:**
- Modify: `src/components/pages/HooksPageContent.tsx`

**Step 1: AddHookDialog 컴포넌트 구현**

`HooksPageContent.tsx` 내에 AddHookDialog를 구현한다.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
```

주요 기능:
- Event 선택 (17개 이벤트 목록, Select)
- Type 선택 (이벤트별 지원 type만 표시)
- Matcher 입력 (이벤트가 지원 시)
- command type: Command 입력, Timeout, Async toggle
- prompt/agent type: Prompt textarea, Model select
- Templates (버튼으로 원클릭 채움)

이벤트별 지원 type 정보:
```typescript
const HOOK_EVENT_META: Record<HookEventName, {
  types: HookType[]
  hasMatcher: boolean
  matcherLabel?: string
}> = {
  SessionStart: { types: ["command"], hasMatcher: true, matcherLabel: "startup/resume/clear/compact" },
  UserPromptSubmit: { types: ["command", "prompt", "agent"], hasMatcher: false },
  PreToolUse: { types: ["command", "prompt", "agent"], hasMatcher: true, matcherLabel: "tool name" },
  PermissionRequest: { types: ["command", "prompt", "agent"], hasMatcher: true, matcherLabel: "tool name" },
  PostToolUse: { types: ["command", "prompt", "agent"], hasMatcher: true, matcherLabel: "tool name" },
  PostToolUseFailure: { types: ["command", "prompt", "agent"], hasMatcher: true, matcherLabel: "tool name" },
  Notification: { types: ["command"], hasMatcher: true, matcherLabel: "notification type" },
  SubagentStart: { types: ["command"], hasMatcher: true, matcherLabel: "agent type" },
  SubagentStop: { types: ["command", "prompt", "agent"], hasMatcher: true, matcherLabel: "agent type" },
  Stop: { types: ["command", "prompt", "agent"], hasMatcher: false },
  TeammateIdle: { types: ["command"], hasMatcher: false },
  TaskCompleted: { types: ["command", "prompt", "agent"], hasMatcher: false },
  ConfigChange: { types: ["command"], hasMatcher: true, matcherLabel: "config source" },
  WorktreeCreate: { types: ["command"], hasMatcher: false },
  WorktreeRemove: { types: ["command"], hasMatcher: false },
  PreCompact: { types: ["command"], hasMatcher: true, matcherLabel: "manual/auto" },
  SessionEnd: { types: ["command"], hasMatcher: true, matcherLabel: "exit reason" },
}
```

Templates:
```typescript
const HOOK_TEMPLATES = [
  {
    label: "Auto Format (Biome)",
    event: "PostToolUse" as HookEventName,
    type: "command" as HookType,
    matcher: "Edit|Write",
    command: "npx biome check --write",
  },
  {
    label: "File Guard",
    event: "PreToolUse" as HookEventName,
    type: "command" as HookType,
    matcher: "Edit|Write",
    command: ".claude/hooks/pre-edit-guard.sh",
    timeout: 5,
  },
  {
    label: "Bash Guard",
    event: "PreToolUse" as HookEventName,
    type: "command" as HookType,
    matcher: "Bash",
    command: ".claude/hooks/pre-bash-guard.sh",
    timeout: 5,
  },
  {
    label: "Quality Gate",
    event: "Stop" as HookEventName,
    type: "command" as HookType,
    command: "pnpm typecheck",
  },
  {
    label: "Auto Test",
    event: "PostToolUse" as HookEventName,
    type: "command" as HookType,
    matcher: "Edit|Write",
    command: "npm test",
  },
]
```

Dialog에서 Add 클릭 시:
```typescript
const handleAdd = () => {
  const hookEntry: Record<string, unknown> = { type: formType }
  if (formType === "command") {
    hookEntry.command = formCommand
    if (formTimeout) hookEntry.timeout = Number(formTimeout)
    if (formAsync) hookEntry.async = true
  } else {
    hookEntry.prompt = formPrompt
    if (formModel) hookEntry.model = formModel
  }

  const matcherGroup: { matcher?: string; hooks: Array<Record<string, unknown>> } = {
    hooks: [hookEntry],
  }
  if (formMatcher) matcherGroup.matcher = formMatcher

  addMutation.mutate(
    { event: formEvent, matcherGroup },
    { onSuccess: () => setAddDialogScope(null) },
  )
}
```

**Step 2: HooksPageContent에서 Dialog 렌더링**

```tsx
{addDialogScope != null && (
  <AddHookDialog
    scope={addDialogScope}
    onClose={() => setAddDialogScope(null)}
  />
)}
```

**Step 3: typecheck + lint 확인**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/pages/HooksPageContent.tsx
git commit -m "feat(hooks): implement Add Hook dialog with templates"
```

---

### Task 9: Layout 브레드크럼 처리

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: /hooks 라우트에서 브레드크럼 숨기기**

`src/components/Layout.tsx`의 `buildBreadcrumbItems` 함수에서 `/hooks` 경로일 때 빈 배열을 반환:

```typescript
function buildBreadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const items: Array<{ label: string; href?: string }> = []

  // /hooks 는 자체 타이틀이 있으므로 브레드크럼 불필요
  if (segments[0] === "hooks") {
    return items
  }

  if (segments.length === 0) {
    items.push({ label: m.nav_dashboard() })
    return items
  }
  // ... (나머지 기존 코드)
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(hooks): hide breadcrumb for /hooks route"
```

---

### Task 10: 통합 테스트 + QA

**Files:**
- Modify: `tests/services/hooks-service.test.ts` (이미 Task 2에서 작성)

**Step 1: 기존 테스트 전체 통과 확인**

Run: `pnpm test`
Expected: PASS (기존 124 + 새 hooks-service 테스트)

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: lint 확인**

Run: `pnpm lint`
Expected: PASS

**Step 4: 빌드 확인**

Run: `pnpm build`
Expected: PASS

**Step 5: 최종 Commit (필요 시)**

```bash
git add -A
git commit -m "test(hooks): verify all quality checks pass"
```

---

## 작업 순서 요약

| Task | 내용 | 예상 파일 |
|------|------|----------|
| 1 | Hook 타입 정의 | `types.ts` |
| 2 | HooksService + 테스트 | `hooks-service.ts`, `hooks-service.test.ts` |
| 3 | Server Functions | `server/hooks.ts` |
| 4 | Query Keys + React Hook | `query-keys.ts`, `use-config.ts` |
| 5 | 라우트 + 사이드바 | `routes/hooks.tsx`, `Sidebar.tsx`, `HooksPageContent.tsx` (stub) |
| 6 | 좌측 패널 (트리) | `HooksPageContent.tsx` |
| 7 | 우측 패널 (상세) | `HooksPageContent.tsx` |
| 8 | Add Hook Dialog | `HooksPageContent.tsx` |
| 9 | Layout 브레드크럼 | `Layout.tsx` |
| 10 | 통합 테스트 + QA | 전체 |

## 의존성

```text
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
                                                                      ↓
Task 9 (독립)                                                    Task 10
```

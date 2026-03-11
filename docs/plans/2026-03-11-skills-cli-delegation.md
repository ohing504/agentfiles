# Skills CLI Delegation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skill 삭제를 `fs.unlink` 직접 삭제에서 `npx skills remove` CLI 위임으로 전환하여 symlink/원본/멀티에이전트 메타데이터를 일괄 정리

**Architecture:** `skills-cli-service.ts` 신규 서비스가 CLI spawn을 담당하고, `deleteItemFn`에서 skill 타입만 분기하여 호출. UI의 `entity-actions.ts`에서 skill 삭제 메뉴를 "전체 삭제"와 "에이전트 단위 제거"로 분리

**Tech Stack:** Node.js spawn, skills CLI (`npx skills`), TanStack Start Server Functions, React Query mutations

---

### Task 1: skills-cli-service.ts 생성

**Files:**
- Create: `src/services/skills-cli-service.ts`
- Reference: `src/services/claude-cli.ts` (spawn 패턴 참고)

**Step 1: 서비스 파일 작성**

```typescript
// src/services/skills-cli-service.ts
import { spawn } from "node:child_process"

const TIMEOUT_MS = 30_000

export interface SkillsRemoveOptions {
  name: string
  scope: "user" | "project"
  agent?: string
  projectPath?: string
}

export interface SkillsCliResult {
  success: boolean
  output: string
}

function execSkills(
  args: string[],
  options?: { cwd?: string; timeout?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["skills", ...args], {
      cwd: options?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timeoutMs = options?.timeout ?? TIMEOUT_MS
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`skills ${args[0]} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0 && code !== null) {
        const detail = stderr.trim() || stdout.trim() || `exit code ${code}`
        reject(new Error(detail))
      } else {
        resolve(stdout)
      }
    })

    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function removeSkill(
  options: SkillsRemoveOptions,
): Promise<SkillsCliResult> {
  const args: string[] = ["remove", options.name, "-y"]

  if (options.scope === "user") {
    args.push("--global")
  }

  if (options.agent) {
    args.push("--agent", options.agent)
  }

  try {
    const output = await execSkills(args, {
      cwd: options.scope === "project" ? options.projectPath : undefined,
    })
    return { success: true, output }
  } catch (err) {
    return {
      success: false,
      output: err instanceof Error ? err.message : String(err),
    }
  }
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
feat(services): add skills-cli-service for CLI delegation
```

---

### Task 2: deleteItemFn에 skill 분기 추가

**Files:**
- Modify: `src/server/items.ts:108-135`

**Step 1: deleteItemFn input에 agent 옵션 추가 및 skill 분기**

`deleteItemFn`의 input validator에 `agent` 추가, handler에서 skill 타입이면 `removeSkill()` 호출:

```typescript
export const deleteItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: agentFileTypeSchema,
      name: z.string().min(1),
      scope: scopeSchema,
      projectPath: z.string().optional(),
      agent: z.string().optional(),  // NEW
    }),
  )
  .handler(async ({ data }) => {
    const { validateItemName } = await import("@/server/validation")
    validateItemName(data.name)

    if (data.type === "skill") {
      const { removeSkill } = await import("@/services/skills-cli-service")
      const result = await removeSkill({
        name: data.name,
        scope: data.scope as "user" | "project",
        agent: data.agent,
        projectPath: data.projectPath,
      })
      if (!result.success) throw new Error(result.output)
      return { success: true }
    }

    // agent, command 등 기존 타입은 fs.unlink 유지
    const path = await import("node:path")
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { deleteFile } = await import("@/services/file-writer")

    const basePath =
      data.scope === "user"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    const dirName = `${data.type}s`
    const filePath = path.join(basePath, dirName, `${data.name}.md`)
    await deleteFile(filePath)
    return { success: true }
  })
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```text
feat(server): delegate skill deletion to skills CLI
```

---

### Task 3: entity-actions에 "Remove from agent" 액션 추가

**Files:**
- Modify: `src/lib/entity-actions.ts`

**Step 1: EntityActionId에 "remove-from-agent" 추가, skill 액션 배열 업데이트**

```typescript
export type EntityActionId =
  | "open-vscode"
  | "open-cursor"
  | "open-folder"
  | "edit"
  | "delete"
  | "remove-from-agent"  // NEW

// ...

const removeFromAgent: EntityAction = {
  id: "remove-from-agent",
  label: "Remove from Agent",
  icon: Trash2,
  variant: "destructive",
}

export const ENTITY_ACTIONS: Record<EntityActionType, EntityAction[]> = {
  skill: [openVscode, openCursor, openFolder, deleteAction, removeFromAgent],
  // ... 나머지 동일
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
feat(ui): add remove-from-agent action for skills
```

---

### Task 4: 대시보드 액션 핸들러에서 remove-from-agent 처리

**Files:**
- Modify: `src/features/dashboard/hooks/use-entity-action-handler.ts`

**Step 1: switch case에 "remove-from-agent" 추가**

`handleDelete` 함수의 skill 분기에서 `agent` 파라미터를 전달하도록 수정. `remove-from-agent` 케이스에서는 현재 선택된 에이전트를 `agent` 파라미터로 전달:

```typescript
case "remove-from-agent": {
  if (target.type === "skill") {
    const { deleteItemFn } = await import("@/server/items")
    await deleteItemFn({
      data: {
        type: "skill",
        name: target.skill.name,
        scope: target.skill.scope,
        agent: "claude-code", // 현재 agentfiles는 Claude Code 전용
        projectPath: activeProjectPath,
      },
    })
    queryClient.invalidateQueries()
    onAfterDelete?.()
  }
  break
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```text
feat(dashboard): handle remove-from-agent action
```

---

### Task 5: skills-editor deleteMutation에 agent 파라미터 지원 추가

**Files:**
- Modify: `src/features/skills-editor/api/skills.queries.ts:69-81`

**Step 1: deleteMutation params에 agent 추가**

```typescript
const deleteMutation = useMutation({
  mutationFn: async (params: { name: string; scope: Scope; agent?: string }) => {
    const { deleteItemFn } = await import("@/server/items")
    return deleteItemFn({
      data: {
        type: "skill" as const,
        ...params,
        projectPath: activeProjectPath ?? undefined,
      },
    })
  },
  onSuccess: invalidate,
})
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```sql
feat(skills-editor): pass agent param to delete mutation
```

---

### Task 6: 통합 검증

**Step 1: typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: lint**

Run: `pnpm lint`
Expected: PASS

**Step 3: build**

Run: `pnpm build`
Expected: PASS

**Step 4: test**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit (lint fix 등 필요시)**

```text
chore: fix lint issues from skills-cli-delegation
```

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

// ── Zod 스키마 ──

const hookScopeSchema = z.enum(["global", "project", "local"])

const hookTypeSchema = z.enum(["command", "prompt", "agent"])

const hookEntrySchema = z.object({
  type: hookTypeSchema,
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
  "Setup",
  "PreCompact",
  "SessionEnd",
])

// ── 경로 resolve 헬퍼 ──

type HookScope = z.infer<typeof hookScopeSchema>

async function resolveSettingsFilePath(
  scope: HookScope,
  projectPath?: string,
): Promise<string> {
  const path = await import("node:path")
  const os = await import("node:os")

  switch (scope) {
    case "global":
      return path.join(os.homedir(), ".claude", "settings.json")
    case "project":
      return path.join(projectPath ?? process.cwd(), ".claude", "settings.json")
    case "local":
      return path.join(
        projectPath ?? process.cwd(),
        ".claude",
        "settings.local.json",
      )
  }
}

// ── Server Functions ──

export const getHooksFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: hookScopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getHooksFromSettings } = await import("@/services/hooks-service")
    const filePath = await resolveSettingsFilePath(data.scope, data.projectPath)
    return getHooksFromSettings(filePath)
  })

export const addHookFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: hookScopeSchema,
      event: hookEventNameSchema,
      matcherGroup: matcherGroupSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { addHookToSettings } = await import("@/services/hooks-service")
    const filePath = await resolveSettingsFilePath(data.scope, data.projectPath)
    await addHookToSettings(filePath, data.event, data.matcherGroup)
    return { success: true }
  })

export const removeHookFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: hookScopeSchema,
      event: hookEventNameSchema,
      groupIndex: z.number().int().min(0),
      hookIndex: z.number().int().min(0),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { removeHookFromSettings } = await import("@/services/hooks-service")
    const filePath = await resolveSettingsFilePath(data.scope, data.projectPath)
    await removeHookFromSettings(
      filePath,
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
    const { readScriptFile } = await import("@/services/hooks-service")

    let resolvedPath = data.filePath

    // $CLAUDE_PROJECT_DIR 치환
    if (data.projectPath) {
      resolvedPath = resolvedPath
        .replace(/"\$CLAUDE_PROJECT_DIR"/g, data.projectPath)
        .replace(/\$CLAUDE_PROJECT_DIR/g, data.projectPath)
    }

    // 상대 경로면 projectPath와 join
    if (!path.isAbsolute(resolvedPath) && data.projectPath) {
      resolvedPath = path.join(data.projectPath, resolvedPath)
    }

    const content = await readScriptFile(resolvedPath)
    return { content }
  })

import { FileCode, MessageSquare, Zap } from "lucide-react"
import { z } from "zod"
import { m } from "@/paraglide/messages"
import type {
  HookEntry,
  HookEventName,
  HookScope,
  HookType,
} from "@/shared/types"

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface SelectedHook {
  scope: HookScope
  event: HookEventName
  groupIndex: number
  hookIndex: number
  hook: HookEntry
  matcher?: string
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

export function getHookDisplayName(hook: HookEntry): string {
  if (hook.type === "command" && hook.command) {
    const cmd = hook.command
      .replace(/"\$CLAUDE_PROJECT_DIR"\//g, "")
      .replace(/\$CLAUDE_PROJECT_DIR\//g, "")
    const parts = cmd.split("/")
    const last = parts[parts.length - 1]
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

export function getHookIcon(hook: HookEntry): React.ElementType {
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

// ── HOOK_EVENT_META ───────────────────────────────────────────────────────────

export const HOOK_EVENT_META: Record<
  HookEventName,
  {
    types: HookType[]
    hasMatcher: boolean
    matcherLabel?: string
    descFn: () => string
  }
> = {
  SessionStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "startup/resume/clear/compact",
    descFn: () => m.claude_hook_desc_SessionStart(),
  },
  UserPromptSubmit: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_UserPromptSubmit(),
  },
  PreToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PreToolUse(),
  },
  PermissionRequest: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PermissionRequest(),
  },
  PostToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PostToolUse(),
  },
  PostToolUseFailure: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PostToolUseFailure(),
  },
  Notification: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "notification type",
    descFn: () => m.claude_hook_desc_Notification(),
  },
  SubagentStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "agent type",
    descFn: () => m.claude_hook_desc_SubagentStart(),
  },
  SubagentStop: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "agent type",
    descFn: () => m.claude_hook_desc_SubagentStop(),
  },
  Stop: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_Stop(),
  },
  TeammateIdle: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_TeammateIdle(),
  },
  TaskCompleted: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_TaskCompleted(),
  },
  ConfigChange: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "config source",
    descFn: () => m.claude_hook_desc_ConfigChange(),
  },
  WorktreeCreate: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_WorktreeCreate(),
  },
  WorktreeRemove: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_WorktreeRemove(),
  },
  Setup: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_Setup(),
  },
  PreCompact: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "manual/auto",
    descFn: () => m.claude_hook_desc_PreCompact(),
  },
  SessionEnd: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "exit reason",
    descFn: () => m.claude_hook_desc_SessionEnd(),
  },
}

// Lifecycle 순서로 정렬된 이벤트 그룹
export const EVENT_GROUPS: { label: string; events: HookEventName[] }[] = [
  {
    label: "Session",
    events: ["SessionStart", "UserPromptSubmit"],
  },
  {
    label: "Tool",
    events: [
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
    ],
  },
  {
    label: "Agent",
    events: ["SubagentStart", "SubagentStop", "TaskCompleted"],
  },
  {
    label: "Response",
    events: ["Stop", "TeammateIdle", "PreCompact", "SessionEnd"],
  },
  {
    label: "Standalone",
    events: [
      "Notification",
      "ConfigChange",
      "WorktreeCreate",
      "WorktreeRemove",
    ],
  },
]

export const HOOK_HANDLER_DESC: Record<HookType, () => string> = {
  command: () => m.claude_hook_handler_command(),
  prompt: () => m.claude_hook_handler_prompt(),
  agent: () => m.claude_hook_handler_agent(),
}

export const HOOK_SCOPE_DESC: Record<HookScope, () => string> = {
  global: () => m.claude_hook_scope_global(),
  project: () => m.claude_hook_scope_project(),
  local: () => m.claude_hook_scope_local(),
}

// ── HOOK_TEMPLATES ────────────────────────────────────────────────────────────

export const HOOK_TEMPLATES: Array<{
  label: string
  event: HookEventName
  type: HookType
  matcher?: string
  command?: string
  timeout?: number
  prompt?: string
}> = [
  {
    label: "Auto Format (Biome)",
    event: "PostToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: "npx biome check --write",
  },
  {
    label: "File Guard",
    event: "PreToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: ".claude/hooks/pre-edit-guard.sh",
    timeout: 5,
  },
  {
    label: "Bash Guard",
    event: "PreToolUse",
    type: "command",
    matcher: "Bash",
    command: ".claude/hooks/pre-bash-guard.sh",
    timeout: 5,
  },
  {
    label: "Quality Gate",
    event: "Stop",
    type: "command",
    command: "pnpm typecheck",
  },
  {
    label: "Auto Test",
    event: "PostToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: "npm test",
  },
]

// ── hookFormSchema ────────────────────────────────────────────────────────────

export const hookFormSchema = z.object({
  event: z.string().min(1),
  type: z.enum(["command", "prompt", "agent"]),
  matcher: z.string(),
  command: z.string(),
  prompt: z.string(),
  model: z.string(),
  timeout: z.string(),
  statusMessage: z.string(),
  async: z.boolean(),
  once: z.boolean(),
})

export type HookFormValues = z.infer<typeof hookFormSchema>

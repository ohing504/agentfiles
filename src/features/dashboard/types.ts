import type {
  AgentFile,
  HookEntry,
  HookScope,
  McpServer,
  MemoryFile,
  Plugin,
} from "@/shared/types"

export type DashboardDetailTarget =
  | { type: "plugin"; plugin: Plugin }
  | { type: "skill"; skill: AgentFile }
  | { type: "agent"; agent: AgentFile }
  | { type: "mcp"; server: McpServer }
  | {
      type: "hook"
      hook: HookEntry
      event: string
      matcher?: string
      scope?: HookScope
    }
  | { type: "memory"; file: MemoryFile }
  | null

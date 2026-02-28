import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { scopeSchema } from "@/shared/types"

export const getMcpServersFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { getMcpServers } = await import("@/services/mcp-service")
    return getMcpServers(data.projectPath)
  })

export const addMcpServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      command: z.string().optional(),
      args: z.array(z.string()).optional(),
      url: z.string().optional(),
      env: z.record(z.string(), z.string()).optional(),
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { mcpAdd } = await import("@/services/claude-cli")
    await mcpAdd(
      data.name,
      { command: data.command, args: data.args, env: data.env },
      data.scope,
    )
    return { success: true }
  })

export const removeMcpServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { mcpRemove } = await import("@/services/claude-cli")
    await mcpRemove(data.name, data.scope)
    return { success: true }
  })

export const getMcpStatusFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { mcpListStatus } = await import("@/services/claude-cli")
    const { parseMcpList } = await import("@/services/mcp-service")
    try {
      // Run `claude mcp list` from the active project dir so it picks up
      // project-scoped servers. Falls back to home dir if no project selected.
      const stdout = await mcpListStatus(data.projectPath)
      return parseMcpList(stdout)
    } catch (error) {
      // Log to server console so failures are diagnosable.
      // Common causes: claude CLI not in PATH, timeout (mcp list takes ~15s),
      // or a spawned MCP server hanging without TTY.
      console.error("[getMcpStatusFn] claude mcp list failed:", error)
      return {} as Record<string, import("@/shared/types").McpConnectionStatus>
    }
  })

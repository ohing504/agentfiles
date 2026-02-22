import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { scopeSchema } from "@/shared/types"

export const getMcpServersFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { getMcpServers } = await import("@/services/config-service")
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

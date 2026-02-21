import { createServerFn } from "@tanstack/react-start"
import type { Scope } from "@/shared/types"

export const getMcpServersFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string }) => data)
  .handler(async ({ data }: { data: { projectPath?: string } }) => {
    const { getMcpServers } = await import("@/services/config-service")
    return getMcpServers(data.projectPath)
  })

export const addMcpServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      scope: Scope
      projectPath?: string
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        name: string
        command?: string
        args?: string[]
        url?: string
        env?: Record<string, string>
        scope: Scope
        projectPath?: string
      }
    }) => {
      const { mcpAdd } = await import("@/services/claude-cli")
      await mcpAdd(
        data.name,
        { command: data.command, args: data.args, env: data.env },
        data.scope,
      )
      return { success: true }
    },
  )

export const removeMcpServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { name: string; scope: Scope; projectPath?: string }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { name: string; scope: Scope; projectPath?: string }
    }) => {
      const { mcpRemove } = await import("@/services/claude-cli")
      await mcpRemove(data.name, data.scope)
      return { success: true }
    },
  )

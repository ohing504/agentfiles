import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const pluginScopeSchema = z.enum(["user", "project", "local", "managed"])

export const getPluginsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { getPlugins } = await import("@/services/plugin-service")
    const projectPath = data.projectPath
      ? validateProjectPath(data.projectPath)
      : undefined
    return getPlugins(projectPath)
  })

export const togglePluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      enable: z.boolean(),
      scope: pluginScopeSchema.optional(),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { pluginToggle } = await import("@/services/claude-cli")
    const projectPath = data.projectPath
      ? validateProjectPath(data.projectPath)
      : undefined
    await pluginToggle(data.id, data.enable, data.scope, projectPath)
    return { success: true }
  })

export const uninstallPluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      scope: pluginScopeSchema.optional(),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { pluginUninstall } = await import("@/services/claude-cli")
    const projectPath = data.projectPath
      ? validateProjectPath(data.projectPath)
      : undefined
    await pluginUninstall(data.id, data.scope, projectPath)
    return { success: true }
  })

export const updatePluginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { pluginUpdate } = await import("@/services/claude-cli")
    await pluginUpdate(data.id)
    return { success: true }
  })

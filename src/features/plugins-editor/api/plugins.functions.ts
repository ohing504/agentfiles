import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { validateProjectPath } from "@/server/validation"
import {
  pluginToggle,
  pluginUninstall,
  pluginUpdate,
} from "@/services/claude-cli"
import { getPlugins } from "@/services/plugin-service"

const pluginScopeSchema = z.enum(["user", "project", "local", "managed"])

export const getPluginsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectPath: z.string().optional() }))
  .handler(async ({ data }) => {
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
    }),
  )
  .handler(async ({ data }) => {
    await pluginToggle(data.id, data.enable, data.scope)
    return { success: true }
  })

export const uninstallPluginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      scope: pluginScopeSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    await pluginUninstall(data.id, data.scope)
    return { success: true }
  })

export const updatePluginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await pluginUpdate(data.id)
    return { success: true }
  })

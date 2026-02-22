import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const getPluginsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPlugins } = await import("@/services/config-service")
    return getPlugins()
  },
)

export const togglePluginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), enable: z.boolean() }))
  .handler(async ({ data }) => {
    const { pluginToggle } = await import("@/services/claude-cli")
    await pluginToggle(data.id, data.enable)
    return { success: true }
  })

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const configScopeSchema = z.enum(["user", "project", "local"])

export const getConfigSettingsFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: configScopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { readSettings, resolveSettingsPath } = await import(
      "@/services/config-settings.service"
    )
    const filePath = resolveSettingsPath(data.scope, data.projectPath)
    const result = await readSettings(filePath)
    return result as Record<string, object>
  })

export const updateConfigSettingFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: configScopeSchema,
      key: z.string().min(1),
      value: z.unknown(),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { writeSettingKey, resolveSettingsPath } = await import(
      "@/services/config-settings.service"
    )
    const filePath = resolveSettingsPath(data.scope, data.projectPath)
    await writeSettingKey(filePath, data.key, data.value)
    return { success: true }
  })

export const deleteConfigSettingFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: configScopeSchema,
      key: z.string().min(1),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { deleteSettingKey, resolveSettingsPath } = await import(
      "@/services/config-settings.service"
    )
    const filePath = resolveSettingsPath(data.scope, data.projectPath)
    await deleteSettingKey(filePath, data.key)
    return { success: true }
  })

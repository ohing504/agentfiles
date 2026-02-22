import { createServerFn } from "@tanstack/react-start"

export const getSettingsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { scope: "global" | "project"; projectPath?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { readSettingsJson, getGlobalConfigPath, getProjectConfigPath } =
      await import("@/services/config-service")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    return readSettingsJson(basePath) as Promise<Record<string, object>>
  })

export const saveSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      scope: "global" | "project"
      projectPath?: string
      settings: Record<string, unknown>
    }) => data,
  )
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { writeSettingsJson } = await import("@/services/file-writer")
    const basePath =
      data.scope === "global"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    await writeSettingsJson(basePath, data.settings)
    return { success: true }
  })

export const getClaudeAppJsonFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readClaudeAppJson } = await import("@/services/config-service")
    return readClaudeAppJson() as Promise<Record<string, object>>
  },
)

export const getProjectLocalSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string }) => data)
  .handler(async ({ data }) => {
    const { readProjectLocalSettings } = await import(
      "@/services/config-service"
    )
    return readProjectLocalSettings(data.projectPath) as Promise<
      Record<string, object>
    >
  })

import { createServerFn } from "@tanstack/react-start"
import type { Scope } from "@/shared/types"

export const getClaudeMdFn = createServerFn({ method: "GET" })
  .inputValidator((data: { scope: Scope; projectPath?: string }) => data)
  .handler(
    async ({ data }: { data: { scope: Scope; projectPath?: string } }) => {
      const { getClaudeMd } = await import("@/services/config-service")
      return getClaudeMd(data.scope, data.projectPath)
    },
  )

export const saveClaudeMdFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { scope: Scope; content: string; projectPath?: string }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { scope: Scope; content: string; projectPath?: string }
    }) => {
      const { getGlobalConfigPath, getProjectConfigPath } = await import(
        "@/services/config-service"
      )
      const { writeMarkdown } = await import("@/services/file-writer")
      const path = await import("node:path")

      const basePath =
        data.scope === "global"
          ? getGlobalConfigPath()
          : getProjectConfigPath(data.projectPath)
      const filePath = path.join(basePath, "CLAUDE.md")
      await writeMarkdown(filePath, data.content)
      return { success: true }
    },
  )

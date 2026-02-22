import { createServerFn } from "@tanstack/react-start"
import type { Scope } from "@/shared/types"

export const readClaudeMdFileFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { projectPath?: string; relativePath?: string; global?: boolean }) =>
      data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { projectPath?: string; relativePath?: string; global?: boolean }
    }) => {
      const fs = await import("node:fs/promises")
      const nodePath = await import("node:path")

      let filePath: string
      if (data.global) {
        const { getGlobalConfigPath } = await import(
          "@/services/config-service"
        )
        filePath = nodePath.join(getGlobalConfigPath(), "CLAUDE.md")
      } else {
        if (!data.projectPath || !data.relativePath) {
          throw new Error("projectPath and relativePath are required")
        }
        filePath = nodePath.join(data.projectPath, data.relativePath)
        if (!filePath.startsWith(nodePath.resolve(data.projectPath))) {
          throw new Error("Invalid file path")
        }
      }

      try {
        const content = await fs.readFile(filePath, "utf-8")
        const stat = await fs.stat(filePath)
        return {
          content,
          path: filePath,
          size: stat.size,
          lastModified: stat.mtime.toISOString(),
        }
      } catch {
        return { content: "", path: filePath, size: 0, lastModified: "" }
      }
    },
  )

export const saveClaudeMdFileFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      projectPath?: string
      relativePath?: string
      global?: boolean
      content: string
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        projectPath?: string
        relativePath?: string
        global?: boolean
        content: string
      }
    }) => {
      const { writeMarkdown } = await import("@/services/file-writer")
      const nodePath = await import("node:path")

      let filePath: string
      if (data.global) {
        const { getGlobalConfigPath } = await import(
          "@/services/config-service"
        )
        filePath = nodePath.join(getGlobalConfigPath(), "CLAUDE.md")
      } else {
        if (!data.projectPath || !data.relativePath) {
          throw new Error("projectPath and relativePath are required")
        }
        filePath = nodePath.join(data.projectPath, data.relativePath)
        if (!filePath.startsWith(nodePath.resolve(data.projectPath))) {
          throw new Error("Invalid file path")
        }
      }

      await writeMarkdown(filePath, data.content)
      return { success: true }
    },
  )

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

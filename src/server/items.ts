import { createServerFn } from "@tanstack/react-start"
import type { AgentFile, Scope } from "@/shared/types"

export const getItemsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { type: AgentFile["type"]; projectPath?: string }) => data,
  )
  .handler(
    // @ts-expect-error -- AgentFile.frontmatter index signature incompatible with TanStack Start serialization
    async ({
      data,
    }: {
      data: { type: AgentFile["type"]; projectPath?: string }
    }) => {
      const { getAgentFiles } = await import("@/services/config-service")
      return getAgentFiles(data.type, data.projectPath)
    },
  )

export const getItemFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      type: AgentFile["type"]
      name: string
      scope: Scope
      projectPath?: string
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        type: AgentFile["type"]
        name: string
        scope: Scope
        projectPath?: string
      }
    }) => {
      const fs = await import("node:fs/promises")
      const path = await import("node:path")
      const { getGlobalConfigPath, getProjectConfigPath, getAgentFiles } =
        await import("@/services/config-service")
      const { validateItemName } = await import("@/server/validation")

      validateItemName(data.name)

      const files = await getAgentFiles(data.type, data.projectPath)
      const file = files.find(
        (f) => f.name === data.name && f.scope === data.scope,
      )

      if (!file) {
        const basePath =
          data.scope === "global"
            ? getGlobalConfigPath()
            : getProjectConfigPath(data.projectPath)
        const dirName = `${data.type}s`
        const filePath = path.join(basePath, dirName, `${data.name}.md`)
        try {
          const content = await fs.readFile(filePath, "utf-8")
          return {
            name: data.name,
            scope: data.scope,
            type: data.type,
            path: filePath,
            content,
          }
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(`File not found: ${data.name}`)
          }
          throw err
        }
      }

      const content = await fs.readFile(file.path, "utf-8")
      return { ...file, content }
    },
  )

export const saveItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      type: AgentFile["type"]
      name: string
      content: string
      scope: Scope
      projectPath?: string
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        type: AgentFile["type"]
        name: string
        content: string
        scope: Scope
        projectPath?: string
      }
    }) => {
      const path = await import("node:path")
      const { getGlobalConfigPath, getProjectConfigPath } = await import(
        "@/services/config-service"
      )
      const { writeMarkdown } = await import("@/services/file-writer")
      const { validateItemName } = await import("@/server/validation")

      validateItemName(data.name)

      const basePath =
        data.scope === "global"
          ? getGlobalConfigPath()
          : getProjectConfigPath(data.projectPath)
      const dirName = `${data.type}s`
      const filePath = path.join(basePath, dirName, `${data.name}.md`)
      await writeMarkdown(filePath, data.content)
      return { success: true, path: filePath }
    },
  )

export const deleteItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      type: AgentFile["type"]
      name: string
      scope: Scope
      projectPath?: string
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        type: AgentFile["type"]
        name: string
        scope: Scope
        projectPath?: string
      }
    }) => {
      const path = await import("node:path")
      const { getGlobalConfigPath, getProjectConfigPath } = await import(
        "@/services/config-service"
      )
      const { deleteFile } = await import("@/services/file-writer")
      const { validateItemName } = await import("@/server/validation")

      validateItemName(data.name)

      const basePath =
        data.scope === "global"
          ? getGlobalConfigPath()
          : getProjectConfigPath(data.projectPath)
      const dirName = `${data.type}s`
      const filePath = path.join(basePath, dirName, `${data.name}.md`)
      await deleteFile(filePath)
      return { success: true }
    },
  )

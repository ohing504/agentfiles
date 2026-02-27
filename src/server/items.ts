import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { agentFileTypeSchema, scopeSchema } from "@/shared/types"

export const getItemsFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      type: agentFileTypeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getAgentFiles } = await import("@/services/agent-file-service")
    return getAgentFiles(data.type, data.projectPath)
  })

export const readFileContentFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ filePath: z.string().min(1) }))
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const content = await fs.readFile(data.filePath, "utf-8")
    return { content }
  })

export const getItemFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      type: agentFileTypeSchema,
      name: z.string().min(1),
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { getAgentFiles } = await import("@/services/agent-file-service")
    const { validateItemName } = await import("@/server/validation")

    validateItemName(data.name)

    const files = await getAgentFiles(data.type, data.projectPath)
    const file = files.find(
      (f) => f.name === data.name && f.scope === data.scope,
    )

    if (!file) {
      const basePath =
        data.scope === "user"
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
  })

export const saveItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: agentFileTypeSchema,
      name: z.string().min(1),
      content: z.string(),
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const path = await import("node:path")
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { writeMarkdown } = await import("@/services/file-writer")
    const { validateItemName } = await import("@/server/validation")

    validateItemName(data.name)

    const basePath =
      data.scope === "user"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    const dirName = `${data.type}s`
    const filePath = path.join(basePath, dirName, `${data.name}.md`)
    await writeMarkdown(filePath, data.content)
    return { success: true, path: filePath }
  })

export const deleteItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: agentFileTypeSchema,
      name: z.string().min(1),
      scope: scopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const path = await import("node:path")
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/services/config-service"
    )
    const { deleteFile } = await import("@/services/file-writer")
    const { validateItemName } = await import("@/server/validation")

    validateItemName(data.name)

    const basePath =
      data.scope === "user"
        ? getGlobalConfigPath()
        : getProjectConfigPath(data.projectPath)
    const dirName = `${data.type}s`
    const filePath = path.join(basePath, dirName, `${data.name}.md`)
    await deleteFile(filePath)
    return { success: true }
  })

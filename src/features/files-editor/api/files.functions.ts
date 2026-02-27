import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const filesScopeSchema = z.enum(["global", "project"])

export const getFileTreeFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scope: filesScopeSchema,
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { scanClaudeDir } = await import("../services/files-scanner.service")
    return scanClaudeDir(data.scope, data.projectPath)
  })

export const getFileContentFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      filePath: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { readFileContent } = await import(
      "../services/files-scanner.service"
    )
    return readFileContent(data.filePath)
  })

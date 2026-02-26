import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const openInEditorFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      filePath: z.string().min(1),
      editor: z.enum(["code", "cursor"]),
    }),
  )
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execAsync = promisify(exec)
    try {
      await execAsync(`${data.editor} "${data.filePath}"`)
      return { success: true }
    } catch {
      return { success: false, error: `Failed to open ${data.editor}` }
    }
  })

export const openFolderFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      dirPath: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execAsync = promisify(exec)
    try {
      const cmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "explorer"
            : "xdg-open"
      await execAsync(`${cmd} "${data.dirPath}"`)
      return { success: true }
    } catch {
      return { success: false }
    }
  })

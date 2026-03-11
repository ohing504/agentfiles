import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { scopeSchema } from "@/shared/types"

export const createAgentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9-]+$/),
      scope: scopeSchema,
      description: z.string().optional(),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      "@/server/config"
    )

    const basePath =
      data.scope === "user"
        ? path.join(getGlobalConfigPath(), "agents")
        : path.join(getProjectConfigPath(data.projectPath), "agents")

    await fs.mkdir(basePath, { recursive: true })

    const agentPath = path.join(basePath, `${data.name}.md`)

    const frontmatter = [
      "---",
      `name: ${data.name}`,
      data.description ? `description: ${data.description}` : "description: ",
      "---",
    ].join("\n")

    const template = `${frontmatter}\n\n# ${data.name}\n\nAgent instructions here.\n`
    await fs.writeFile(agentPath, template, "utf-8")

    return { success: true, path: agentPath }
  })

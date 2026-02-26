import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const readSupportingFileFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      skillPath: z.string().min(1),
      relativePath: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const dirPath = path.dirname(data.skillPath)
    const filePath = path.resolve(dirPath, data.relativePath)

    // Path traversal prevention
    if (!filePath.startsWith(dirPath)) {
      throw new Error("Invalid path")
    }

    const content = await fs.readFile(filePath, "utf-8")
    return { content, relativePath: data.relativePath }
  })

export const saveFrontmatterFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      filePath: z.string().min(1),
      frontmatter: z.record(z.string(), z.unknown()),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const matter = (await import("gray-matter")).default

    const raw = await fs.readFile(data.filePath, "utf-8")
    const parsed = matter(raw)

    // Replace frontmatter, keep body
    const updated = matter.stringify(parsed.content, data.frontmatter)
    await fs.writeFile(data.filePath, updated, "utf-8")
    return { success: true }
  })

export { openFolderFn, openInEditorFn } from "@/server/editor"

export const createSkillFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9-]+$/),
      scope: z.enum(["global", "project"]),
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
      data.scope === "global"
        ? path.join(getGlobalConfigPath(), "skills", data.name)
        : path.join(getProjectConfigPath(data.projectPath), "skills", data.name)

    const skillMdPath = path.join(basePath, "SKILL.md")

    // Create directory
    await fs.mkdir(basePath, { recursive: true })

    // Write template SKILL.md
    const frontmatter = [
      "---",
      `name: ${data.name}`,
      data.description ? `description: ${data.description}` : "description: ",
      "---",
    ].join("\n")

    const template = `${frontmatter}\n\n# ${data.name}\n\nSkill instructions here.\n`
    await fs.writeFile(skillMdPath, template, "utf-8")

    return { success: true, path: skillMdPath }
  })

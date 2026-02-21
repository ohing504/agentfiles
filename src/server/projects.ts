import { createServerFn } from "@tanstack/react-start"

export const getProjectsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()

    const fs = await import("node:fs")
    const path = await import("node:path")
    const projects = config.projects.map((p) => ({
      ...p,
      hasClaudeDir: fs.existsSync(path.join(p.path, ".claude")),
    }))

    return { projects, activeProject: config.activeProject }
  },
)

export const addProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }: { data: { path: string } }) => {
    const { validateProjectPath } = await import("@/server/validation")
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )
    const nodePath = await import("node:path")

    const resolvedPath = validateProjectPath(data.path)

    const config = await readProjectsConfig()

    if (config.projects.some((p) => p.path === resolvedPath)) {
      throw new Error(`Project already registered: ${resolvedPath}`)
    }

    const name = nodePath.basename(resolvedPath)
    config.projects.push({
      path: resolvedPath,
      name,
      addedAt: new Date().toISOString(),
    })
    config.activeProject = resolvedPath

    await writeProjectsConfig(config)
    return { success: true, path: resolvedPath, name }
  })

export const removeProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }: { data: { path: string } }) => {
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )

    const config = await readProjectsConfig()
    config.projects = config.projects.filter((p) => p.path !== data.path)

    if (config.activeProject === data.path) {
      config.activeProject = config.projects[0]?.path ?? null
    }

    await writeProjectsConfig(config)
    return { success: true }
  })

export const setActiveProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string | null }) => data)
  .handler(async ({ data }: { data: { path: string | null } }) => {
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )

    const config = await readProjectsConfig()
    config.activeProject = data.path

    await writeProjectsConfig(config)
    return { success: true }
  })

export const scanClaudeMdFilesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath: string }) => data)
  .handler(async ({ data }: { data: { projectPath: string } }) => {
    const { scanClaudeMdFiles } = await import("@/services/config-service")
    return scanClaudeMdFiles(data.projectPath)
  })

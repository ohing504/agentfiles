import { createServerFn } from "@tanstack/react-start"

export const getMemoryFilesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath: string }) => data)
  .handler(async ({ data }) => {
    const { getMemoryFiles } = await import("@/services/memory-service")
    return getMemoryFiles(data.projectPath)
  })

import { createServerFn } from "@tanstack/react-start"

export const getOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string }) => data)
  .handler(async ({ data }: { data: { projectPath?: string } }) => {
    const { getOverview: getOverviewService } = await import(
      "@/services/config-service"
    )
    return getOverviewService(data.projectPath)
  })

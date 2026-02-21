import { createServerFn } from "@tanstack/react-start"

export const getOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getOverview: getOverviewService } = await import(
      "@/services/config-service"
    )
    return getOverviewService()
  },
)

import { createFileRoute } from "@tanstack/react-router"
import { ProjectOverviewGrid } from "@/features/dashboard/components/ProjectOverviewGrid"

export const Route = createFileRoute("/")({ component: DashboardPage })

function DashboardPage() {
  return (
    <div className="h-full overflow-hidden">
      <ProjectOverviewGrid />
    </div>
  )
}

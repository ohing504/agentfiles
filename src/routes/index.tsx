import { createFileRoute } from "@tanstack/react-router"
import { BoardLayout } from "@/components/board/BoardLayout"

export const Route = createFileRoute("/")({ component: DashboardPage })

function DashboardPage() {
  return (
    <div className="h-full overflow-hidden">
      <BoardLayout />
    </div>
  )
}

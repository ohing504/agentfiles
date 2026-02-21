import { createFileRoute } from "@tanstack/react-router"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/agents/$name")({
  component: AgentDetailPage,
})

function AgentDetailPage() {
  const { name } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{m.detail_agent({ name })}</h1>
      <p className="text-muted-foreground">{m.app_coming_soon()}</p>
    </div>
  )
}

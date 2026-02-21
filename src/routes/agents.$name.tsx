import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agents/$name')({
  component: AgentDetailPage,
})

function AgentDetailPage() {
  const { name } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Agent: {name}</h1>
      <p className="text-muted-foreground">Phase 9에서 구현 예정</p>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/plugins/$id')({
  component: PluginDetailPage,
})

function PluginDetailPage() {
  const { id } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Plugin: {id}</h1>
      <p className="text-muted-foreground">Phase 9에서 구현 예정</p>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mcp/$name')({ component: McpDetailPage })

function McpDetailPage() {
  const { name } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">MCP Server: {name}</h1>
      <p className="text-muted-foreground">Phase 9에서 구현 예정</p>
    </div>
  )
}

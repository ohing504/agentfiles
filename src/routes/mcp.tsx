import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mcp')({ component: McpPage })

function McpPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">MCP Servers</h1>
      <p className="text-muted-foreground">Phase 9에서 구현 예정</p>
    </div>
  )
}

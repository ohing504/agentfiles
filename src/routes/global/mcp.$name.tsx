import { createFileRoute } from "@tanstack/react-router"
import { McpDetailContent } from "@/components/pages/McpDetailContent"

export const Route = createFileRoute("/global/mcp/$name")({
  component: GlobalMcpDetail,
})

function GlobalMcpDetail() {
  const { name } = Route.useParams()
  return <McpDetailContent name={name} scope="global" />
}

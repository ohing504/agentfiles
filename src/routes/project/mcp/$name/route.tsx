import { createFileRoute } from "@tanstack/react-router"
import { McpDetailContent } from "@/components/pages/McpDetailContent"

export const Route = createFileRoute("/project/mcp/$name")({
  component: ProjectMcpDetail,
})

function ProjectMcpDetail() {
  const { name } = Route.useParams()
  return <McpDetailContent name={name} scope="project" />
}

import { createFileRoute } from "@tanstack/react-router"
import { McpPageContent } from "@/components/pages/McpPageContent"

export const Route = createFileRoute("/project/mcp")({
  component: () => <McpPageContent scope="project" />,
})

import { createFileRoute } from "@tanstack/react-router"
import { McpPageContent } from "@/components/pages/McpPageContent"

export const Route = createFileRoute("/global/mcp/")({
  component: () => <McpPageContent scope="global" />,
})

import { createFileRoute } from "@tanstack/react-router"
import { AgentsPage } from "@/features/agents-editor/components/AgentsPage"

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
})

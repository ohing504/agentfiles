import { createFileRoute } from "@tanstack/react-router"
import { PluginsPageContent } from "@/components/pages/PluginsPageContent"

export const Route = createFileRoute("/project/plugins/")({
  component: () => <PluginsPageContent scope="project" />,
})

import { createFileRoute } from "@tanstack/react-router"
import { PluginsPageContent } from "@/components/pages/PluginsPageContent"

export const Route = createFileRoute("/global/plugins")({
  component: () => <PluginsPageContent scope="user" />,
})

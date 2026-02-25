import { createFileRoute } from "@tanstack/react-router"
import { PluginsPage } from "@/features/plugins-editor/components/PluginsPage"

export const Route = createFileRoute("/plugins")({
  component: PluginsPage,
})

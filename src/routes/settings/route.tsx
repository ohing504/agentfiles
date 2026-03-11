import { createFileRoute } from "@tanstack/react-router"
import { ConfigPage } from "@/components/config-editor/components/ConfigPage"

export const Route = createFileRoute("/settings")({
  component: () => <ConfigPage />,
})

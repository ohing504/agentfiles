import { createFileRoute } from "@tanstack/react-router"
import { ConfigPage } from "@/features/config-editor/components/ConfigPage"

export const Route = createFileRoute("/global/settings")({
  component: () => <ConfigPage />,
})

import { createFileRoute } from "@tanstack/react-router"
import { GlobalSettingsPage } from "@/components/settings/GlobalSettingsPage"

export const Route = createFileRoute("/global/settings")({
  component: () => <GlobalSettingsPage />,
})

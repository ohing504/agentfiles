import { createFileRoute } from "@tanstack/react-router"
import { ProjectSettingsPage } from "@/components/settings/ProjectSettingsPage"

export const Route = createFileRoute("/project/settings")({
  component: ProjectSettingsPage,
})

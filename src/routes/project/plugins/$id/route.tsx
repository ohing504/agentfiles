import { createFileRoute } from "@tanstack/react-router"
import { PluginDetailContent } from "@/components/pages/PluginDetailContent"

export const Route = createFileRoute("/project/plugins/$id")({
  component: ProjectPluginDetail,
})

function ProjectPluginDetail() {
  const { id } = Route.useParams()
  return <PluginDetailContent id={id} scope="project" />
}

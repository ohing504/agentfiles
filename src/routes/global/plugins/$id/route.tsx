import { createFileRoute } from "@tanstack/react-router"
import { PluginDetailContent } from "@/components/pages/PluginDetailContent"

export const Route = createFileRoute("/global/plugins/$id")({
  component: GlobalPluginDetail,
})

function GlobalPluginDetail() {
  const { id } = Route.useParams()
  return <PluginDetailContent id={id} scope="user" />
}

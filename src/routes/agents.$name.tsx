import { createFileRoute } from "@tanstack/react-router"
import { Bot } from "lucide-react"
import { AgentFileDetail } from "@/components/AgentFileDetail"
import { useAgentFiles } from "@/hooks/use-config"
import { parseAgentFileParam } from "@/lib/parse-agent-file-param"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/agents/$name")({
  component: AgentDetailPage,
})

function AgentDetailPage() {
  const { name: encodedName } = Route.useParams()
  const { decoded, scope, name } = parseAgentFileParam(encodedName)

  const { query } = useAgentFiles("agent")
  const { data: agents, isLoading } = query

  const agent = agents?.find(
    (a: AgentFile) => a.name === name && a.scope === scope,
  )

  const title = agent
    ? m.detail_agent({
        name: agent.namespace ? `${agent.namespace}:${agent.name}` : agent.name,
      })
    : ""

  return (
    <AgentFileDetail
      item={agent}
      isLoading={isLoading}
      decoded={decoded}
      backTo="/agents"
      backLabel="Back to Agents"
      icon={<Bot className="w-6 h-6 text-muted-foreground" />}
      title={title}
    />
  )
}

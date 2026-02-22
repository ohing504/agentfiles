import { createFileRoute } from "@tanstack/react-router"
import { Terminal } from "lucide-react"
import { AgentFileDetail } from "@/components/AgentFileDetail"
import { useAgentFiles } from "@/hooks/use-config"
import { parseAgentFileParam } from "@/lib/parse-agent-file-param"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/commands/$name")({
  component: CommandDetailPage,
})

function CommandDetailPage() {
  const { name: encodedName } = Route.useParams()
  const { decoded, scope, name } = parseAgentFileParam(encodedName)

  const { query } = useAgentFiles("command")
  const { data: commands, isLoading } = query

  const command = commands?.find(
    (c: AgentFile) => c.name === name && c.scope === scope,
  )

  const title = command
    ? m.detail_command({
        name: command.namespace
          ? `${command.namespace}:${command.name}`
          : command.name,
      })
    : ""

  return (
    <AgentFileDetail
      item={command}
      isLoading={isLoading}
      decoded={decoded}
      backTo="/commands"
      backLabel="Back to Commands"
      icon={<Terminal className="w-6 h-6 text-muted-foreground" />}
      title={title}
    />
  )
}

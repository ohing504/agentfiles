import { createFileRoute } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"
import { AgentFileDetail } from "@/components/AgentFileDetail"
import { Badge } from "@/components/ui/badge"
import { useAgentFiles } from "@/hooks/use-config"
import { parseAgentFileParam } from "@/lib/parse-agent-file-param"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/skills/$name")({
  component: SkillDetailPage,
})

function SkillDetailPage() {
  const { name: encodedName } = Route.useParams()
  const { decoded, scope, name } = parseAgentFileParam(encodedName)

  const { query } = useAgentFiles("skill")
  const { data: skills, isLoading } = query

  const skill = skills?.find(
    (s: AgentFile) => s.name === name && s.scope === scope,
  )

  const title = skill
    ? m.detail_skill({
        name: skill.namespace ? `${skill.namespace}:${skill.name}` : skill.name,
      })
    : ""

  const extraBadges = skill?.isSymlink ? (
    <Badge variant="outline" className="text-xs font-mono">
      symlink
    </Badge>
  ) : undefined

  const extraDetailRows =
    skill?.isSymlink && skill.symlinkTarget ? (
      <div className="flex gap-2">
        <span className="text-muted-foreground w-32 shrink-0">
          Symlink Target
        </span>
        <span className="font-mono text-xs break-all">
          {skill.symlinkTarget}
        </span>
      </div>
    ) : undefined

  return (
    <AgentFileDetail
      item={skill}
      isLoading={isLoading}
      decoded={decoded}
      backTo="/skills"
      backLabel="Back to Skills"
      icon={<Sparkles className="w-6 h-6 text-muted-foreground" />}
      title={title}
      extraBadges={extraBadges}
      extraDetailRows={extraDetailRows}
    />
  )
}

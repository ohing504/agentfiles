import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, FileText, Sparkles } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFiles } from "@/hooks/use-config"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/skills/$name")({
  component: SkillDetailPage,
})

function SkillDetailPage() {
  const { name: encodedName } = Route.useParams()
  const decoded = decodeURIComponent(encodedName)
  const [scope, ...nameParts] = decoded.split(":")
  const skillName = nameParts.join(":")

  const { query } = useAgentFiles("skill")
  const { data: skills, isLoading } = query

  const skill = skills?.find(
    (s: AgentFile) => s.name === skillName && s.scope === scope,
  )

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!skill) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/skills">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Skills
          </Link>
        </Button>
        <p className="text-muted-foreground">Skill not found: {decoded}</p>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/skills">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Skills
        </Link>
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {skill.namespace ? `${skill.namespace}:${skill.name}` : skill.name}
        </h1>
        <ScopeBadge scope={skill.scope} />
        {skill.isSymlink && (
          <Badge variant="outline" className="text-xs font-mono">
            symlink
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Name</span>
              <span className="font-mono">{skill.name}</span>
            </div>
            {skill.namespace && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">
                  Namespace
                </span>
                <span className="font-mono">{skill.namespace}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Scope</span>
              <ScopeBadge scope={skill.scope} />
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Path</span>
              <span className="font-mono text-xs break-all">{skill.path}</span>
            </div>
            {skill.isSymlink && skill.symlinkTarget && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">
                  Symlink Target
                </span>
                <span className="font-mono text-xs break-all">
                  {skill.symlinkTarget}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Size</span>
              <span>{skill.size} bytes</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">
                Last Modified
              </span>
              <span>{new Date(skill.lastModified).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {skill.frontmatter && Object.keys(skill.frontmatter).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Frontmatter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(skill.frontmatter).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0 capitalize">
                    {key}
                  </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Content
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-md p-4 max-h-96 overflow-auto">
              <span className="text-muted-foreground italic">
                Open file to view content: {skill.path}
              </span>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

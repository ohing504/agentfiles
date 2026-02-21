import { createFileRoute, Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFiles } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/skills")({ component: SkillsPage })

function SkillsPage() {
  const { query } = useAgentFiles("skill")
  const { data: skills, isLoading } = query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{m.nav_skills()}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !skills || skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Sparkles className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No skills found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill: AgentFile) => (
            <Link
              key={`${skill.scope}-${skill.name}`}
              to="/skills/$name"
              params={{
                name: encodeURIComponent(`${skill.scope}:${skill.name}`),
              }}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {skill.namespace
                            ? `${skill.namespace}:${skill.name}`
                            : skill.name}
                        </CardTitle>
                        {skill.frontmatter?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {skill.frontmatter.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {skill.isSymlink && (
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          symlink
                        </span>
                      )}
                      <ScopeBadge scope={skill.scope} />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

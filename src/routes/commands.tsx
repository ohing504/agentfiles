import { createFileRoute, Link } from "@tanstack/react-router"
import { Terminal } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFiles } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/commands")({ component: CommandsPage })

function CommandsPage() {
  const { query } = useAgentFiles("command")
  const { data: commands, isLoading } = query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{m.nav_commands()}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !commands || commands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Terminal className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No commands found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commands.map((command: AgentFile) => (
            <Link
              key={`${command.scope}-${command.name}`}
              to="/commands/$name"
              params={{
                name: encodeURIComponent(`${command.scope}:${command.name}`),
              }}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {command.namespace
                            ? `${command.namespace}:${command.name}`
                            : command.name}
                        </CardTitle>
                        {command.frontmatter?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {command.frontmatter.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ScopeBadge scope={command.scope} />
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

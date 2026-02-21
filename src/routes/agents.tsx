import { createFileRoute, Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFiles } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/agents")({ component: AgentsPage })

function AgentsPage() {
  const { query } = useAgentFiles("agent")
  const { data: agents, isLoading } = query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{m.nav_agents()}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bot className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No agents found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent: AgentFile) => (
            <Link
              key={`${agent.scope}-${agent.name}`}
              to="/agents/$name"
              params={{
                name: encodeURIComponent(`${agent.scope}:${agent.name}`),
              }}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {agent.namespace
                            ? `${agent.namespace}:${agent.name}`
                            : agent.name}
                        </CardTitle>
                        {agent.frontmatter?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {agent.frontmatter.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ScopeBadge scope={agent.scope} />
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

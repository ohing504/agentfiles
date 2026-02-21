import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, FileText, Terminal } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFiles } from "@/hooks/use-config"
import type { AgentFile } from "@/shared/types"

export const Route = createFileRoute("/commands/$name")({
  component: CommandDetailPage,
})

function CommandDetailPage() {
  const { name: encodedName } = Route.useParams()
  const decoded = decodeURIComponent(encodedName)
  const [scope, ...nameParts] = decoded.split(":")
  const commandName = nameParts.join(":")

  const { query } = useAgentFiles("command")
  const { data: commands, isLoading } = query

  const command = commands?.find(
    (c: AgentFile) => c.name === commandName && c.scope === scope,
  )

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!command) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/commands">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Commands
          </Link>
        </Button>
        <p className="text-muted-foreground">Command not found: {decoded}</p>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/commands">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Commands
        </Link>
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <Terminal className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {command.namespace
            ? `${command.namespace}:${command.name}`
            : command.name}
        </h1>
        <ScopeBadge scope={command.scope} />
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
              <span className="font-mono">{command.name}</span>
            </div>
            {command.namespace && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">
                  Namespace
                </span>
                <span className="font-mono">{command.namespace}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Scope</span>
              <ScopeBadge scope={command.scope} />
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Path</span>
              <span className="font-mono text-xs break-all">
                {command.path}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Size</span>
              <span>{command.size} bytes</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">
                Last Modified
              </span>
              <span>{new Date(command.lastModified).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {command.frontmatter && Object.keys(command.frontmatter).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Frontmatter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(command.frontmatter).map(([key, value]) => (
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
                Open file to view content: {command.path}
              </span>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

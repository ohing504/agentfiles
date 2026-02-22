import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Bot,
  CheckCircle2,
  FileText,
  Puzzle,
  Server,
  Sparkles,
  Terminal,
  TriangleAlert,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, useOverview } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/")({ component: DashboardPage })

function StatCard({
  to,
  icon: Icon,
  label,
  count,
  globalCount,
  projectCount,
  isLoading,
}: {
  to: string
  icon: React.ElementType
  label: string
  count: number
  globalCount?: number
  projectCount?: number
  isLoading: boolean
}) {
  return (
    <Link to={to}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <span className="text-3xl font-bold">{count}</span>
          )}
          {!isLoading &&
            globalCount !== undefined &&
            projectCount !== undefined && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>
                  {m.scope_global()}: {globalCount}
                </span>
                <span>
                  {m.scope_project()}: {projectCount}
                </span>
              </div>
            )}
        </CardContent>
      </Card>
    </Link>
  )
}

function ClaudeMdCard({ isLoading }: { isLoading: boolean }) {
  const { data: overview } = useOverview()

  const globalExists = !!overview?.claudeMd?.global
  const projectExists = !!overview?.claudeMd?.project

  return (
    <Link to="/files">
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">{m.nav_claude_md()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                {globalExists ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {m.scope_global()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {projectExists ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {m.scope_project()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function CliStatusBadge() {
  const { data: cliStatus, isLoading } = useCliStatus()

  if (isLoading) {
    return <Skeleton className="h-5 w-28" />
  }

  if (!cliStatus) return null

  return cliStatus.available ? (
    <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Claude CLI {cliStatus.version}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="text-destructive border-destructive gap-1"
    >
      <XCircle className="w-3 h-3" />
      Claude CLI unavailable
    </Badge>
  )
}

function DashboardPage() {
  const { data: overview, isLoading } = useOverview()

  const conflictCount = overview?.conflictCount ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{m.nav_dashboard()}</h1>
        <div className="flex items-center gap-3">
          {conflictCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <TriangleAlert className="w-3 h-3" />
              {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
            </Badge>
          )}
          <CliStatusBadge />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          to="/plugins"
          icon={Puzzle}
          label={m.nav_plugins()}
          count={overview?.plugins?.total ?? 0}
          globalCount={overview?.plugins?.user ?? 0}
          projectCount={overview?.plugins?.project ?? 0}
          isLoading={isLoading}
        />
        <StatCard
          to="/mcp"
          icon={Server}
          label={m.nav_mcp_servers()}
          count={overview?.mcpServers?.total ?? 0}
          globalCount={overview?.mcpServers?.global ?? 0}
          projectCount={overview?.mcpServers?.project ?? 0}
          isLoading={isLoading}
        />
        <StatCard
          to="/files"
          icon={Bot}
          label={m.nav_agents()}
          count={overview?.agents?.total ?? 0}
          globalCount={overview?.agents?.global ?? 0}
          projectCount={overview?.agents?.project ?? 0}
          isLoading={isLoading}
        />
        <StatCard
          to="/files"
          icon={Terminal}
          label={m.nav_commands()}
          count={overview?.commands?.total ?? 0}
          globalCount={overview?.commands?.global ?? 0}
          projectCount={overview?.commands?.project ?? 0}
          isLoading={isLoading}
        />
        <StatCard
          to="/files"
          icon={Sparkles}
          label={m.nav_skills()}
          count={overview?.skills?.total ?? 0}
          globalCount={overview?.skills?.global ?? 0}
          projectCount={overview?.skills?.project ?? 0}
          isLoading={isLoading}
        />
        <ClaudeMdCard isLoading={isLoading} />
      </div>
    </div>
  )
}

import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  GitCommit,
  HardDrive,
  Package,
  Puzzle,
  Tag,
  XCircle,
} from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, usePlugins } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/plugins/$id")({
  component: PluginDetailPage,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm break-all">{value}</div>
      </div>
    </div>
  )
}

function PluginDetailPage() {
  const { id } = Route.useParams()
  const pluginId = decodeURIComponent(id)
  const { query, mutation } = usePlugins()
  const { data: cliStatus } = useCliStatus()
  const cliAvailable = cliStatus?.available ?? false

  const plugin = query.data?.find((p) => p.id === pluginId)

  const handleToggle = () => {
    if (!plugin) return
    mutation.mutate({ id: plugin.id, enable: !plugin.enabled })
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm py-8">
        <AlertCircle className="w-4 h-4" />
        <span>Failed to load plugins</span>
      </div>
    )
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Puzzle className="w-10 h-10" />
        <p className="text-sm">Plugin not found: {pluginId}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/plugins">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Plugins
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/plugins">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {m.nav_plugins()}
            </Link>
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Puzzle className="w-6 h-6 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{plugin.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {plugin.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ScopeBadge scope={plugin.scope} />
            {plugin.enabled ? (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <XCircle className="w-3 h-3" />
                Disabled
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Toggle card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plugin Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {plugin.enabled ? "Plugin is enabled" : "Plugin is disabled"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle to enable or disable this plugin via Claude CLI
              </p>
            </div>
            <Button
              variant={plugin.enabled ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              disabled={mutation.isPending || !cliAvailable}
            >
              {mutation.isPending
                ? "Updating..."
                : plugin.enabled
                  ? "Disable"
                  : "Enable"}
            </Button>
          </div>
          {mutation.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm mt-3">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to toggle plugin. Please try again.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-1">
          <MetaRow
            icon={Package}
            label="Marketplace"
            value={plugin.marketplace}
          />
          <MetaRow
            icon={Tag}
            label="Version"
            value={<span className="font-mono text-xs">v{plugin.version}</span>}
          />
          <MetaRow
            icon={GitCommit}
            label="Git Commit SHA"
            value={
              <span className="font-mono text-xs">{plugin.gitCommitSha}</span>
            }
          />
          <MetaRow
            icon={HardDrive}
            label="Install Path"
            value={
              <span className="font-mono text-xs break-all">
                {plugin.installPath}
              </span>
            }
          />
          {plugin.projectPath && (
            <MetaRow
              icon={HardDrive}
              label="Project Path"
              value={
                <span className="font-mono text-xs break-all">
                  {plugin.projectPath}
                </span>
              }
            />
          )}
          <MetaRow
            icon={Clock}
            label="Installed At"
            value={formatDate(plugin.installedAt)}
          />
          <MetaRow
            icon={Clock}
            label="Last Updated"
            value={formatDate(plugin.lastUpdated)}
          />
        </CardContent>
      </Card>
    </div>
  )
}

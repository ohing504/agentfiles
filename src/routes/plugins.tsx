import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Puzzle,
  XCircle,
} from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, usePlugins } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { Plugin } from "@/shared/types"

export const Route = createFileRoute("/plugins")({ component: PluginsPage })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function PluginCard({
  plugin,
  cliAvailable,
}: {
  plugin: Plugin
  cliAvailable: boolean
}) {
  const { mutation } = usePlugins()

  const handleToggle = () => {
    mutation.mutate({ id: plugin.id, enable: !plugin.enabled })
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <Link
          to="/plugins/$id"
          params={{ id: encodeURIComponent(plugin.id) }}
          className="flex items-center gap-2 min-w-0 hover:underline"
        >
          <Puzzle className="w-4 h-4 text-muted-foreground shrink-0" />
          <CardTitle className="text-sm font-medium truncate">
            {plugin.name}
          </CardTitle>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <ScopeBadge scope={plugin.scope} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          {plugin.enabled ? (
            <Badge
              variant="outline"
              className="text-green-600 border-green-600 gap-1 text-xs"
            >
              <CheckCircle2 className="w-3 h-3" />
              Enabled
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-muted-foreground gap-1 text-xs"
            >
              <XCircle className="w-3 h-3" />
              Disabled
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            v{plugin.version}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <Package className="w-3 h-3 inline mr-1" />
          {plugin.marketplace}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDate(plugin.installedAt)}</span>
          </div>
          <Button
            variant={plugin.enabled ? "default" : "outline"}
            size="sm"
            className="h-6 text-xs px-2"
            disabled={mutation.isPending || !cliAvailable}
            onClick={handleToggle}
          >
            {plugin.enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PluginListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PluginsPage() {
  const { query } = usePlugins()
  const { data: cliStatus } = useCliStatus()
  const plugins = query.data ?? []
  const cliAvailable = cliStatus?.available ?? false

  const userPlugins = plugins.filter((p) => p.scope === "user")
  const projectPlugins = plugins.filter((p) => p.scope === "project")

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{m.nav_plugins()}</h1>
        {!query.isLoading && (
          <Badge variant="secondary">{plugins.length}</Badge>
        )}
      </div>

      {query.isLoading && <PluginListSkeleton />}

      {query.isError && (
        <div className="flex items-center gap-2 text-destructive text-sm py-8">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load plugins</span>
        </div>
      )}

      {!query.isLoading && !query.isError && plugins.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Puzzle className="w-10 h-10" />
          <p className="text-sm">No plugins installed</p>
        </div>
      )}

      {!query.isLoading && plugins.length > 0 && (
        <div className="space-y-6">
          {userPlugins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ScopeBadge scope="user" />
                <span className="text-sm text-muted-foreground">
                  {userPlugins.length} plugin
                  {userPlugins.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    cliAvailable={cliAvailable}
                  />
                ))}
              </div>
            </section>
          )}

          {projectPlugins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ScopeBadge scope="project" />
                <span className="text-sm text-muted-foreground">
                  {projectPlugins.length} plugin
                  {projectPlugins.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    cliAvailable={cliAvailable}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

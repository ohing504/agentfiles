import { Link, useRouter } from "@tanstack/react-router"
import { Server, Trash2 } from "lucide-react"
import { ScopeBadge } from "@/components/ScopeBadge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, useMcpServers } from "@/hooks/use-config"
import type { Scope } from "@/shared/types"

// ── Types ────────────────────────────────────────────────────────────────────

interface McpDetailContentProps {
  name: string
  scope: Scope
}

// ── Main Component ───────────────────────────────────────────────────────────

export function McpDetailContent({ name, scope }: McpDetailContentProps) {
  const router = useRouter()
  const { query, removeMutation } = useMcpServers()
  const { data: cliStatus } = useCliStatus()
  const { data: servers, isLoading } = query

  const cliAvailable = cliStatus?.available ?? false
  const backPath = scope === "global" ? "/global/mcp" : "/project/mcp"
  const server = servers?.find((s) => s.name === name && s.scope === scope)

  function handleRemove() {
    if (!server) return
    removeMutation.mutate(
      { name: server.name, scope: server.scope },
      {
        onSuccess: () => {
          router.navigate({ to: backPath })
        },
      },
    )
  }

  return (
    <div>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !server ? (
        <div className="text-center py-16 text-muted-foreground">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">MCP server "{name}" not found</p>
          <Link to={backPath}>
            <Button variant="outline" size="sm" className="mt-4">
              Back to MCP Servers
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">{server.name}</CardTitle>
                {server.disabled && (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    disabled
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ScopeBadge scope={server.scope} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      disabled={removeMutation.isPending || !cliAvailable}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {removeMutation.isPending ? "Removing..." : "Remove"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove MCP Server</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove "{server.name}"? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleRemove}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline">{server.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Scope</p>
                  <ScopeBadge scope={server.scope} />
                </div>
              </div>

              {server.command && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Command</p>
                  <code className="bg-muted text-sm px-2 py-1 rounded font-mono block">
                    {server.command}
                  </code>
                </div>
              )}

              {server.args && server.args.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Arguments
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {server.args.map((arg) => (
                      <code
                        key={arg}
                        className="bg-muted text-xs px-2 py-0.5 rounded font-mono"
                      >
                        {arg}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {server.url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <code className="bg-muted text-sm px-2 py-1 rounded font-mono block break-all">
                    {server.url}
                  </code>
                </div>
              )}

              {server.env && Object.keys(server.env).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Environment Variables
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-sm font-mono"
                      >
                        <span className="text-muted-foreground">{key}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">
                          {"*".repeat(Math.min(value.length, 12))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

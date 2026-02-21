import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Server, Trash2 } from "lucide-react"
import { useState } from "react"
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, useMcpServers } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { Scope } from "@/shared/types"

export const Route = createFileRoute("/mcp")({ component: McpPage })

function AddMcpDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [command, setCommand] = useState("")
  const [args, setArgs] = useState("")
  const [url, setUrl] = useState("")
  const [scope, setScope] = useState<Scope>("global")
  const [type, setType] = useState<"stdio" | "sse" | "streamable-http">("stdio")
  const [error, setError] = useState("")

  const { addMutation } = useMcpServers()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (type === "stdio" && !command.trim()) {
      setError("Command is required for stdio type")
      return
    }

    if ((type === "sse" || type === "streamable-http") && !url.trim()) {
      setError("URL is required for SSE/HTTP type")
      return
    }

    const parsedArgs = args
      .split(" ")
      .map((a) => a.trim())
      .filter(Boolean)

    addMutation.mutate(
      {
        name: name.trim(),
        command: type === "stdio" ? command.trim() : undefined,
        args:
          type === "stdio" && parsedArgs.length > 0 ? parsedArgs : undefined,
        url: type !== "stdio" ? url.trim() : undefined,
        scope,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setName("")
          setCommand("")
          setArgs("")
          setUrl("")
          setScope("global")
          setType("stdio")
          onSuccess()
        },
        onError: (err: unknown) => {
          setError(
            err instanceof Error ? err.message : "Failed to add MCP server",
          )
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                placeholder="my-server"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-type">Type</Label>
              <select
                id="mcp-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "stdio" | "sse" | "streamable-http")
                }
                className="border-input bg-background flex h-8 w-full rounded-lg border px-3 py-1 text-sm"
              >
                <option value="stdio">stdio</option>
                <option value="sse">SSE</option>
                <option value="streamable-http">Streamable HTTP</option>
              </select>
            </div>

            {type === "stdio" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-command">Command</Label>
                  <Input
                    id="mcp-command"
                    placeholder="npx"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-args">Args (space-separated)</Label>
                  <Input
                    id="mcp-args"
                    placeholder="-y @modelcontextprotocol/server-filesystem /path"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mcp-url">URL</Label>
                <Input
                  id="mcp-url"
                  placeholder="https://example.com/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-scope">Scope</Label>
              <select
                id="mcp-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="border-input bg-background flex h-8 w-full rounded-lg border px-3 py-1 text-sm"
              >
                <option value="global">Global (~/.claude/)</option>
                <option value="project">Project (.claude/)</option>
              </select>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function McpServerCard({
  name,
  type,
  scope,
  command,
  args,
  url,
  disabled,
  onRemove,
  isRemoving,
  cliAvailable,
}: {
  name: string
  type: string
  scope: Scope
  command?: string
  args?: string[]
  url?: string
  disabled?: boolean
  onRemove: () => void
  isRemoving: boolean
  cliAvailable: boolean
}) {
  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-4 h-4 text-muted-foreground shrink-0" />
          <Link
            to="/mcp/$name"
            params={{ name }}
            className="font-medium text-sm hover:underline truncate"
          >
            {name}
          </Link>
          {disabled && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground shrink-0"
            >
              disabled
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScopeBadge scope={scope} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={isRemoving || !cliAvailable}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove MCP Server</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{name}"? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit text-xs">
            {type}
          </Badge>
          {command && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              {command}
              {args && args.length > 0 ? ` ${args.join(" ")}` : ""}
            </p>
          )}
          {url && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              {url}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function McpPage() {
  const { query, removeMutation } = useMcpServers()
  const { data: cliStatus } = useCliStatus()
  const { data: servers, isLoading } = query

  const cliAvailable = cliStatus?.available ?? false
  const globalServers = servers?.filter((s) => s.scope === "global") ?? []
  const projectServers = servers?.filter((s) => s.scope === "project") ?? []

  function handleRemove(name: string, scope: Scope) {
    removeMutation.mutate({ name, scope })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{m.nav_mcp_servers()}</h1>
        {cliAvailable && <AddMcpDialog onSuccess={() => {}} />}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (servers?.length ?? 0) === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {globalServers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <ScopeBadge scope="global" />
                <span>
                  {globalServers.length} server
                  {globalServers.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {globalServers.map((server) => (
                  <McpServerCard
                    key={`global-${server.name}`}
                    {...server}
                    onRemove={() => handleRemove(server.name, "global")}
                    isRemoving={removeMutation.isPending}
                    cliAvailable={cliAvailable}
                  />
                ))}
              </div>
            </div>
          )}

          {projectServers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <ScopeBadge scope="project" />
                <span>
                  {projectServers.length} server
                  {projectServers.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectServers.map((server) => (
                  <McpServerCard
                    key={`project-${server.name}`}
                    {...server}
                    onRemove={() => handleRemove(server.name, "project")}
                    isRemoving={removeMutation.isPending}
                    cliAvailable={cliAvailable}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

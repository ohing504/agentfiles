import { Link } from "@tanstack/react-router"
import { Plus, Server, Trash2 } from "lucide-react"
import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliStatus, useMcpServers } from "@/hooks/use-config"
import type { Scope } from "@/shared/types"

// ── Types ────────────────────────────────────────────────────────────────────

interface McpPageContentProps {
  scope: Scope
}

// ── AddMcpDialog ─────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  name: "",
  command: "",
  args: "",
  url: "",
  type: "stdio" as "stdio" | "sse" | "streamable-http",
  error: "",
}

function AddMcpDialog({
  scope,
  onSuccess,
}: {
  scope: Scope
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

  const { addMutation } = useMcpServers()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForm((prev) => ({ ...prev, error: "" }))

    if (!form.name.trim()) {
      setForm((prev) => ({ ...prev, error: "Name is required" }))
      return
    }

    if (form.type === "stdio" && !form.command.trim()) {
      setForm((prev) => ({
        ...prev,
        error: "Command is required for stdio type",
      }))
      return
    }

    if (
      (form.type === "sse" || form.type === "streamable-http") &&
      !form.url.trim()
    ) {
      setForm((prev) => ({
        ...prev,
        error: "URL is required for SSE/HTTP type",
      }))
      return
    }

    const parsedArgs = form.args
      .split(" ")
      .map((a) => a.trim())
      .filter(Boolean)

    addMutation.mutate(
      {
        name: form.name.trim(),
        command: form.type === "stdio" ? form.command.trim() : undefined,
        args:
          form.type === "stdio" && parsedArgs.length > 0
            ? parsedArgs
            : undefined,
        url: form.type !== "stdio" ? form.url.trim() : undefined,
        scope,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setForm(INITIAL_FORM)
          onSuccess()
        },
        onError: (err: unknown) => {
          setForm((prev) => ({
            ...prev,
            error:
              err instanceof Error ? err.message : "Failed to add MCP server",
          }))
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setForm(INITIAL_FORM)
      }}
    >
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
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    type: v as "stdio" | "sse" | "streamable-http",
                  }))
                }
              >
                <SelectTrigger id="mcp-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">stdio</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="streamable-http">
                    Streamable HTTP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "stdio" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-command">Command</Label>
                  <Input
                    id="mcp-command"
                    placeholder="npx"
                    value={form.command}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, command: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-args">Args (space-separated)</Label>
                  <Input
                    id="mcp-args"
                    placeholder="-y @modelcontextprotocol/server-filesystem /path"
                    value={form.args}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, args: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mcp-url">URL</Label>
                <Input
                  id="mcp-url"
                  placeholder="https://example.com/mcp"
                  value={form.url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                />
              </div>
            )}

            {form.error && (
              <p className="text-destructive text-sm">{form.error}</p>
            )}
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

// ── McpServerCard ────────────────────────────────────────────────────────────

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
  const mcpRoute =
    scope === "global" ? "/global/mcp/$name" : ("/project/mcp/$name" as const)

  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-4 h-4 text-muted-foreground shrink-0" />
          <Link
            to={mcpRoute}
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

// ── Main Component ───────────────────────────────────────────────────────────

export function McpPageContent({ scope }: McpPageContentProps) {
  const { query, removeMutation } = useMcpServers()
  const { data: cliStatus } = useCliStatus()
  const { data: servers, isLoading } = query

  const cliAvailable = cliStatus?.available ?? false
  const filteredServers = servers?.filter((s) => s.scope === scope) ?? []

  function handleRemove(name: string, serverScope: Scope) {
    removeMutation.mutate({ name, scope: serverScope })
  }

  return (
    <div>
      {cliAvailable && (
        <div className="flex items-center justify-end mb-4">
          <AddMcpDialog scope={scope} onSuccess={() => {}} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServers.map((server) => (
            <McpServerCard
              key={`${scope}-${server.name}`}
              {...server}
              onRemove={() => handleRemove(server.name, scope)}
              isRemoving={removeMutation.isPending}
              cliAvailable={cliAvailable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useMcpMutations } from "@/hooks/use-mcp"
import { m } from "@/paraglide/messages"
import type { McpServer, Scope } from "@/shared/types"

interface AddMcpDialogProps {
  scope: Scope
  onClose: () => void
  editServer?: McpServer | null
}

export function AddMcpDialog({
  scope,
  onClose,
  editServer,
}: AddMcpDialogProps) {
  const isEdit = !!editServer
  const [form, setForm] = useState({
    name: editServer?.name ?? "",
    command: editServer?.command ?? "",
    args: editServer?.args?.join(" ") ?? "",
    url: editServer?.url ?? "",
    type: (editServer?.type ?? "stdio") as "stdio" | "sse" | "streamable-http",
    error: "",
  })
  const { addMutation, removeMutation } = useMcpMutations()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForm((prev) => ({ ...prev, error: "" }))

    if (!form.name.trim()) {
      setForm((prev) => ({ ...prev, error: m.mcp_add_error_name() }))
      return
    }

    if (form.type === "stdio" && !form.command.trim()) {
      setForm((prev) => ({ ...prev, error: m.mcp_add_error_command() }))
      return
    }

    if (
      (form.type === "sse" || form.type === "streamable-http") &&
      !form.url.trim()
    ) {
      setForm((prev) => ({ ...prev, error: m.mcp_add_error_url() }))
      return
    }

    const parsedArgs = form.args
      .split(" ")
      .map((a) => a.trim())
      .filter(Boolean)

    const addParams = {
      name: form.name.trim(),
      command: form.type === "stdio" ? form.command.trim() : undefined,
      args:
        form.type === "stdio" && parsedArgs.length > 0 ? parsedArgs : undefined,
      url: form.type !== "stdio" ? form.url.trim() : undefined,
      scope,
    }

    if (isEdit && editServer) {
      // Edit: remove old → add new
      removeMutation.mutate(
        { name: editServer.name, scope: editServer.scope },
        {
          onSuccess: () => {
            addMutation.mutate(addParams, {
              onSuccess: () => onClose(),
              onError: (err: unknown) => {
                setForm((prev) => ({
                  ...prev,
                  error:
                    err instanceof Error
                      ? err.message
                      : "Failed to update MCP server",
                }))
              },
            })
          },
          onError: (err: unknown) => {
            setForm((prev) => ({
              ...prev,
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to update MCP server",
            }))
          },
        },
      )
    } else {
      addMutation.mutate(addParams, {
        onSuccess: () => {
          onClose()
        },
        onError: (err: unknown) => {
          setForm((prev) => ({
            ...prev,
            error:
              err instanceof Error ? err.message : "Failed to add MCP server",
          }))
        },
      })
    }
  }

  const isPending = addMutation.isPending || removeMutation.isPending

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? m.mcp_edit_title() : m.mcp_add_title()}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-name">{m.mcp_add_name()}</Label>
              <Input
                id="mcp-name"
                placeholder={m.mcp_add_name_placeholder()}
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-type">{m.mcp_add_type()}</Label>
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
                  <Label htmlFor="mcp-command">{m.mcp_add_command()}</Label>
                  <Input
                    id="mcp-command"
                    placeholder={m.mcp_add_command_placeholder()}
                    value={form.command}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, command: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-args">{m.mcp_add_args()}</Label>
                  <Input
                    id="mcp-args"
                    placeholder={m.mcp_add_args_placeholder()}
                    value={form.args}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, args: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mcp-url">{m.mcp_add_url()}</Label>
                <Input
                  id="mcp-url"
                  placeholder={m.mcp_add_url_placeholder()}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? m.hooks_form_saving()
                  : m.mcp_add_submitting()
                : isEdit
                  ? m.hooks_form_save()
                  : m.mcp_add_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

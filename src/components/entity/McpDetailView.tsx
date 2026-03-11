import { DetailField } from "@/components/DetailField"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { m } from "@/paraglide/messages"
import type { McpConnectionStatus, McpServer } from "@/shared/types"

const STATUS_BADGE_CLASS: Record<
  Exclude<McpConnectionStatus, "unknown">,
  string
> = {
  connected: "border-emerald-500/30 text-emerald-600",
  needs_authentication: "border-amber-500/30 text-amber-600",
  failed: "border-red-500/30 text-red-600",
  disabled: "text-muted-foreground",
}

function getStatusLabel(
  status: Exclude<McpConnectionStatus, "unknown">,
): string {
  switch (status) {
    case "connected":
      return m.mcp_status_connected()
    case "needs_authentication":
      return m.mcp_status_needs_auth()
    case "failed":
      return m.mcp_status_failed()
    case "disabled":
      return m.mcp_status_disabled()
  }
}

interface McpDetailViewProps {
  server: McpServer
  status?: McpConnectionStatus
}

export function McpDetailView({ server, status }: McpDetailViewProps) {
  const resolvedStatus: McpConnectionStatus = server.disabled
    ? "disabled"
    : (status ?? "unknown")
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DetailField label={m.plugin_field_name()}>
          <span className="text-sm font-medium">{server.name}</span>
        </DetailField>
        <DetailField label={m.mcp_field_type()}>
          <Badge variant="secondary" className="text-xs">
            {server.type}
          </Badge>
        </DetailField>
        {server.command && (
          <DetailField label={m.plugin_field_command()}>
            <span className="font-mono text-xs">{server.command}</span>
          </DetailField>
        )}
        {server.url && (
          <DetailField label={m.plugin_field_url()}>
            <span className="font-mono text-xs break-all">{server.url}</span>
          </DetailField>
        )}
        {resolvedStatus !== "unknown" && (
          <DetailField label={m.mcp_field_status()}>
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_BADGE_CLASS[resolvedStatus]}`}
            >
              {getStatusLabel(resolvedStatus)}
            </Badge>
          </DetailField>
        )}
      </dl>

      {server.args && server.args.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {m.mcp_field_args()}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {server.args.map((arg, i) => (
                <code
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered args
                  key={i}
                  className="bg-muted text-xs px-2 py-0.5 rounded font-mono"
                >
                  {arg}
                </code>
              ))}
            </div>
          </div>
        </>
      )}

      {server.env && Object.keys(server.env).length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {m.mcp_field_env()}
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
        </>
      )}
    </div>
  )
}

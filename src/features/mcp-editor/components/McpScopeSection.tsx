import { PlusIcon, ServerIcon } from "lucide-react"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ListItem } from "@/components/ui/list-item"
import { m } from "@/paraglide/messages"
import type { McpConnectionStatus, McpServer, Scope } from "@/shared/types"

const STATUS_ICON_CLASS: Record<McpConnectionStatus, string> = {
  connected: "text-emerald-500",
  needs_authentication: "text-amber-500",
  failed: "text-red-500",
  disabled: "text-muted-foreground/40",
  unknown: "text-muted-foreground",
}

function getStatusTooltip(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return m.mcp_status_connected()
    case "needs_authentication":
      return m.mcp_status_needs_auth()
    case "failed":
      return m.mcp_status_failed()
    case "disabled":
      return m.mcp_status_disabled()
    default:
      return ""
  }
}

interface McpScopeSectionProps {
  label: string
  scope: Scope
  servers: McpServer[]
  searchQuery: string
  selectedServer: McpServer | null
  onSelectServer: (name: string, scope: Scope) => void
  onAddClick: () => void
  statusMap?: Record<string, McpConnectionStatus>
}

export const McpScopeSection = memo(function McpScopeSection({
  label,
  scope,
  servers,
  searchQuery,
  selectedServer,
  onSelectServer,
  onAddClick,
  statusMap,
}: McpScopeSectionProps) {
  const filtered = searchQuery
    ? servers.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : servers

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
          {label}
          <span className="text-muted-foreground/60">({filtered.length})</span>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onAddClick}
          aria-label={`Add ${label} MCP server`}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 mt-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 px-2">
              {searchQuery ? "No results" : "No servers"}
            </p>
          ) : (
            filtered.map((server) => {
              const status: McpConnectionStatus = server.disabled
                ? "disabled"
                : (statusMap?.[server.name] ?? "unknown")
              return (
                <ListItem
                  key={`${server.name}-${server.scope}`}
                  icon={ServerIcon}
                  iconClassName={STATUS_ICON_CLASS[status]}
                  label={server.name}
                  tooltip={getStatusTooltip(status)}
                  selected={
                    selectedServer?.name === server.name &&
                    selectedServer?.scope === scope
                  }
                  onClick={() => onSelectServer(server.name, scope)}
                  trailing={
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      {server.type}
                    </Badge>
                  }
                />
              )
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

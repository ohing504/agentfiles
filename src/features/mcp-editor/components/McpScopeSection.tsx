import { PlusIcon, ServerIcon } from "lucide-react"
import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ItemContextMenu } from "@/components/ui/item-context-menu"
import { ListItem } from "@/components/ui/list-item"
import { getMcpIconClass } from "@/lib/mcp-status"
import { m } from "@/paraglide/messages"
import type { McpConnectionStatus, McpServer, Scope } from "@/shared/types"

function getStatusTooltip(status: McpConnectionStatus): string | undefined {
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
      return undefined
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
  onDeleteServer?: (server: McpServer) => void
  onEditServer?: (server: McpServer) => void
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
  onDeleteServer,
  onEditServer,
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
              const iconClass = getMcpIconClass(server, statusMap)
              return (
                <ItemContextMenu
                  key={`${server.name}-${server.scope}`}
                  filePath={server.configPath}
                  onEdit={
                    !server.fromPlugin && onEditServer
                      ? () => onEditServer(server)
                      : undefined
                  }
                  onDelete={
                    !server.fromPlugin && onDeleteServer
                      ? () => onDeleteServer(server)
                      : undefined
                  }
                  deleteTitle={m.mcp_delete_title()}
                  deleteDescription={m.mcp_delete_confirm({
                    name: server.name,
                  })}
                >
                  <ListItem
                    icon={ServerIcon}
                    iconClassName={iconClass}
                    label={server.name}
                    tooltip={getStatusTooltip(status)}
                    selected={
                      selectedServer?.name === server.name &&
                      selectedServer?.scope === scope
                    }
                    onClick={() => onSelectServer(server.name, scope)}
                    trailing={
                      server.fromPlugin || server.isDuplicate ? (
                        <span className="flex items-center gap-1">
                          {server.fromPlugin && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0 font-normal"
                            >
                              Plugin: {server.fromPlugin}
                            </Badge>
                          )}
                          {server.isDuplicate && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-amber-600 border-amber-300"
                            >
                              ⚠ duplicate
                            </Badge>
                          )}
                        </span>
                      ) : undefined
                    }
                  />
                </ItemContextMenu>
              )
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

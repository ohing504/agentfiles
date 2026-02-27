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
import type { McpServer, Scope } from "@/shared/types"

interface McpScopeSectionProps {
  label: string
  scope: Scope
  servers: McpServer[]
  searchQuery: string
  selectedServer: McpServer | null
  onSelectServer: (name: string, scope: Scope) => void
  onAddClick: () => void
}

export const McpScopeSection = memo(function McpScopeSection({
  label,
  scope,
  servers,
  searchQuery,
  selectedServer,
  onSelectServer,
  onAddClick,
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
            filtered.map((server) => (
              <ListItem
                key={`${server.name}-${server.scope}`}
                icon={ServerIcon}
                label={server.name}
                selected={
                  selectedServer?.name === server.name &&
                  selectedServer?.scope === scope
                }
                onClick={() => onSelectServer(server.name, scope)}
                trailing={
                  <div className="flex items-center gap-1">
                    {server.disabled && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 text-muted-foreground"
                      >
                        off
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      {server.type}
                    </Badge>
                  </div>
                }
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

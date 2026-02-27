import { ExternalLinkIcon, SearchIcon, ServerIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { useProjectContext } from "@/components/ProjectContext"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useMcpMutations } from "../api/mcp.queries"
import { useMcpSelection } from "../context/McpContext"
import { AddMcpDialog } from "./AddMcpDialog"
import { McpScopeSection } from "./McpScopeSection"

export function McpPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [searchQuery, setSearchQuery] = useState("")
  const {
    isLoading,
    globalServers,
    projectServers,
    selectedServer,
    handleSelectServer,
    handleClearSelection,
    addDialogOpen,
    addDialogScope,
    handleAddClick,
    handleAddClose,
    editingServer,
    setEditingServer,
  } = useMcpSelection()
  const { removeMutation } = useMcpMutations()

  function handleDeleteServer() {
    if (!selectedServer) return
    removeMutation.mutate(
      { name: selectedServer.name, scope: selectedServer.scope },
      {
        onSuccess: handleClearSelection,
        onError: (e) => toast.error(e.message || m.mcp_delete_error()),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">{m.mcp_title()}</h2>
          <a
            href={m.mcp_docs_url()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {m.common_docs()}
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={m.mcp_search_placeholder()}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <McpScopeSection
            label="User"
            scope="global"
            servers={globalServers}
            searchQuery={searchQuery}
            selectedServer={selectedServer}
            onSelectServer={handleSelectServer}
            onAddClick={() => handleAddClick("global")}
          />

          {activeProjectPath && (
            <McpScopeSection
              label="Project"
              scope="project"
              servers={projectServers}
              searchQuery={searchQuery}
              selectedServer={selectedServer}
              onSelectServer={handleSelectServer}
              onAddClick={() => handleAddClick("project")}
            />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedServer ? (
          <McpDetailPanel
            server={selectedServer}
            filePath={selectedServer.configPath}
            onEdit={() => setEditingServer(selectedServer)}
            onDelete={handleDeleteServer}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ServerIcon />
                </EmptyMedia>
                <EmptyTitle>{m.mcp_empty_title()}</EmptyTitle>
                <EmptyDescription>{m.mcp_empty_desc()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Add MCP Dialog */}
      {addDialogOpen && (
        <AddMcpDialog scope={addDialogScope} onClose={handleAddClose} />
      )}

      {/* Edit MCP Dialog */}
      {editingServer && (
        <AddMcpDialog
          scope={editingServer.scope}
          onClose={() => setEditingServer(null)}
          editServer={editingServer}
        />
      )}
    </div>
  )
}

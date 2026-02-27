import { AlertTriangle, ExternalLink, WorkflowIcon } from "lucide-react"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useProjectContext } from "@/components/ProjectContext"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentMutations, useAgentsQuery } from "../api/agents.queries"
import { AgentsProvider, useAgentsSelection } from "../context/AgentsContext"
import { AddAgentDialog } from "./AddAgentDialog"
import { AgentDetailPanel } from "./AgentDetailPanel"
import { AgentsScopeSection } from "./AgentsScopeSection"

function AgentsPageInner() {
  const { activeProjectPath } = useProjectContext()
  const {
    selectedAgent,
    handleClearSelection,
    addDialogOpen,
    addDialogScope,
    handleAddClick,
    handleAddClose,
  } = useAgentsSelection()
  const { isLoading } = useAgentsQuery()
  const { deleteMutation } = useAgentMutations()

  function handleDeleteAgent() {
    if (!selectedAgent) return
    deleteMutation.mutate(
      { name: selectedAgent.name, scope: selectedAgent.scope },
      {
        onSuccess: handleClearSelection,
        onError: (e) => toast.error(e.message || "Failed to delete agent"),
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
      {/* Left panel - 280px list */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">Agents</h2>
          <a
            href="https://code.claude.com/docs/en/sub-agents"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <AgentsScopeSection
            label="User"
            scope="global"
            onAddClick={() => handleAddClick("global")}
            onDeleteAgent={handleDeleteAgent}
          />

          {activeProjectPath && (
            <AgentsScopeSection
              label="Project"
              scope="project"
              onAddClick={() => handleAddClick("project")}
              onDeleteAgent={handleDeleteAgent}
            />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedAgent ? (
          <AgentDetailPanel
            agent={selectedAgent}
            onDelete={handleDeleteAgent}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WorkflowIcon />
                </EmptyMedia>
                <EmptyTitle>No agent selected</EmptyTitle>
                <EmptyDescription>
                  Select an agent from the list or create a new one.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {addDialogOpen && (
        <AddAgentDialog scope={addDialogScope} onClose={handleAddClose} />
      )}
    </div>
  )
}

function AgentsErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Failed to load Agents editor</p>
        <p className="text-xs text-muted-foreground">
          Please try refreshing the page
        </p>
      </div>
    </div>
  )
}

export function AgentsPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<AgentsErrorFallback />}>
      <AgentsProvider onSelect={() => setSidebarOpen(false)}>
        <AgentsPageInner />
      </AgentsProvider>
    </ErrorBoundary>
  )
}

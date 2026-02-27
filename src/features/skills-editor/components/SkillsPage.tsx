import { AlertTriangle, ExternalLink, ScrollText, Search } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useProjectContext } from "@/components/ProjectContext"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useSkillMutations, useSkillsQuery } from "../api/skills.queries"
import { SkillsProvider, useSkillsSelection } from "../context/SkillsContext"
import { AddSkillDialog } from "./AddSkillDialog"
import { SkillsScopeSection } from "./SkillsScopeSection"
import { SupportingFilePanel } from "./SupportingFilePanel"

function SkillsPageInner() {
  const { activeProjectPath } = useProjectContext()
  const [searchQuery, setSearchQuery] = useState("")
  const {
    selectedSkill,
    selectedSupportingFile,
    handleClearSelection,
    addDialogOpen,
    addDialogScope,
    handleAddClick,
    handleAddClose,
  } = useSkillsSelection()
  const { isLoading } = useSkillsQuery()
  const { deleteMutation } = useSkillMutations()

  function handleDeleteSkill() {
    if (!selectedSkill) return
    deleteMutation.mutate(
      { name: selectedSkill.name, scope: selectedSkill.scope },
      {
        onSuccess: handleClearSelection,
        onError: (e) => toast.error(e.message || "Failed to delete skill"),
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
      {/* Left panel - 280px tree */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">Skills</h2>
          <a
            href="https://docs.anthropic.com/en/docs/claude-code/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <SkillsScopeSection
            label="User"
            scope="user"
            searchQuery={searchQuery}
            onAddClick={() => handleAddClick("user")}
            onDeleteSkill={handleDeleteSkill}
          />

          {activeProjectPath && (
            <SkillsScopeSection
              label="Project"
              scope="project"
              searchQuery={searchQuery}
              onAddClick={() => handleAddClick("project")}
              onDeleteSkill={handleDeleteSkill}
            />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSkill && selectedSupportingFile ? (
          <SupportingFilePanel />
        ) : selectedSkill ? (
          <SkillDetailPanel
            skill={selectedSkill}
            onDelete={handleDeleteSkill}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollText />
                </EmptyMedia>
                <EmptyTitle>{m.skills_empty_title()}</EmptyTitle>
                <EmptyDescription>{m.skills_empty_desc()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {addDialogOpen && (
        <AddSkillDialog scope={addDialogScope} onClose={handleAddClose} />
      )}
    </div>
  )
}

function SkillsErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Failed to load Skills editor</p>
        <p className="text-xs text-muted-foreground">
          Please try refreshing the page
        </p>
      </div>
    </div>
  )
}

export function SkillsPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<SkillsErrorFallback />}>
      <SkillsProvider onSelect={() => setSidebarOpen(false)}>
        <SkillsPageInner />
      </SkillsProvider>
    </ErrorBoundary>
  )
}

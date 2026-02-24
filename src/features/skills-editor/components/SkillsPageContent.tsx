import { ExternalLink, ScrollText, Search } from "lucide-react"
import { useState } from "react"
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
import { useAgentFiles } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"
import { AddSkillDialog } from "./AddSkillDialog"
import { SkillDetailPanel } from "./SkillDetailPanel"
import { SkillsScopeSection } from "./SkillsScopeSection"
import { SupportingFilePanel } from "./SupportingFilePanel"

export function SkillsPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
  const [selectedSupportingFile, setSelectedSupportingFile] =
    useState<SupportingFile | null>(null)
  const [expandedSkillPath, setExpandedSkillPath] = useState<string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

  // When selecting a skill/command, auto-expand its folder (if it has one) and collapse others
  function handleSelectSkill(skill: AgentFile) {
    setSelectedSkill(skill)
    setSelectedSupportingFile(null)
    // Collapse expanded folder for non-folder items;
    // folder items handle expansion via their own onClick
    const hasSF =
      skill.isSkillDir &&
      skill.supportingFiles &&
      skill.supportingFiles.length > 0
    if (!hasSF) {
      setExpandedSkillPath(null)
    }
  }

  const { query } = useAgentFiles("skill")

  if (query.isLoading) {
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

  const allFiles: AgentFile[] = query.data ?? []

  function handleAddClick(scope: Scope) {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }

  return (
    <div className="flex h-full">
      {/* 좌측 패널 - 280px 트리 */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        {/* 좌측 헤더 */}
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

        {/* 검색 + 트리 */}
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

          {/* Global 스코프 섹션 */}
          <SkillsScopeSection
            label="Global"
            scope="global"
            allFiles={allFiles}
            searchQuery={searchQuery}
            selectedSkill={selectedSkill}
            selectedSupportingFile={selectedSupportingFile}
            expandedSkillPath={expandedSkillPath}
            onSelectSkill={handleSelectSkill}
            onSelectSupportingFile={setSelectedSupportingFile}
            onExpandSkill={setExpandedSkillPath}
            onAddClick={() => handleAddClick("global")}
          />

          {/* Project 스코프 섹션 (activeProjectPath 있을 때만) */}
          {activeProjectPath && (
            <SkillsScopeSection
              label="Project"
              scope="project"
              allFiles={allFiles}
              searchQuery={searchQuery}
              selectedSkill={selectedSkill}
              selectedSupportingFile={selectedSupportingFile}
              expandedSkillPath={expandedSkillPath}
              onSelectSkill={handleSelectSkill}
              onSelectSupportingFile={setSelectedSupportingFile}
              onExpandSkill={setExpandedSkillPath}
              onAddClick={() => handleAddClick("project")}
            />
          )}
        </div>
      </div>

      {/* 우측 패널 - 상세 또는 빈 상태 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSkill && selectedSupportingFile ? (
          <SupportingFilePanel
            key={selectedSupportingFile.relativePath}
            skill={selectedSkill}
            supportingFile={selectedSupportingFile}
          />
        ) : selectedSkill ? (
          <SkillDetailPanel
            key={selectedSkill.path}
            skill={selectedSkill}
            activeProjectPath={activeProjectPath}
            onDeleted={() => {
              setSelectedSkill(null)
              setSelectedSupportingFile(null)
            }}
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

      {/* Add Skill Dialog */}
      {addDialogOpen && (
        <AddSkillDialog
          scope={addDialogScope}
          activeProjectPath={activeProjectPath}
          onClose={() => setAddDialogOpen(false)}
        />
      )}
    </div>
  )
}

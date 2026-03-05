// src/features/dashboard/components/ProjectOverviewGrid.tsx
import { XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { HookDetailPanel } from "@/components/HookDetailPanel"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { PluginDetailPanel } from "@/components/PluginDetailPanel"
import { useProjectContext } from "@/components/ProjectContext"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import { Button } from "@/components/ui/button"
import { AgentDetailPanel } from "@/features/agents-editor/components/AgentDetailPanel"
import { useEntityActionHandler } from "../hooks/use-entity-action-handler"
import type { DashboardDetailTarget } from "../types"
import { AgentsPanel } from "./AgentsPanel"
import { DashboardDetailSheet } from "./DashboardDetailSheet"
import { HooksPanel } from "./HooksPanel"
import { LspServersPanel } from "./LspServersPanel"
import { McpDirectPanel } from "./McpDirectPanel"
import { MemoryDetailPanel } from "./MemoryDetailPanel"
import { MemoryPanel } from "./MemoryPanel"
import { PluginsPanel } from "./PluginsPanel"
import { SkillsPanel } from "./SkillsPanel"

function useIsWideScreen() {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isWide
}

function DetailPanelContent({
  target,
  activeProjectPath,
  onClose,
}: {
  target: DashboardDetailTarget
  activeProjectPath?: string | null
  onClose?: () => void
}) {
  if (!target) return null
  switch (target.type) {
    case "plugin":
      return <PluginDetailPanel plugin={target.plugin} />
    case "skill":
      return <SkillDetailPanel skill={target.skill} />
    case "agent":
      return <AgentDetailPanel agent={target.agent} />
    case "mcp":
      return <McpDetailPanel server={target.server} onClose={onClose} />
    case "hook":
      return (
        <HookDetailPanel
          hook={target.hook}
          event={target.event}
          matcher={target.matcher}
          activeProjectPath={activeProjectPath}
        />
      )
    case "memory":
      return <MemoryDetailPanel file={target.file} />
  }
}

export function ProjectOverviewGrid() {
  const { activeProjectPath } = useProjectContext()
  const [selected, setSelected] = useState<DashboardDetailTarget>(null)
  const isWide = useIsWideScreen()
  const handleAction = useEntityActionHandler(() => setSelected(null))

  return (
    <div className="h-full flex overflow-hidden">
      {/* 패널 그리드 */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          <PluginsPanel
            onSelectItem={setSelected}
            onAction={handleAction}
            href="/plugins"
          />
          <McpDirectPanel
            onSelectItem={setSelected}
            onAction={handleAction}
            href="/mcp"
          />
          <SkillsPanel
            onSelectItem={setSelected}
            onAction={handleAction}
            href="/skills"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 h-[160px] shrink-0">
          <HooksPanel
            onSelectItem={setSelected}
            onAction={handleAction}
            href="/hooks"
          />
          <AgentsPanel
            onSelectItem={setSelected}
            onAction={handleAction}
            href="/agents"
          />
          <LspServersPanel />
        </div>
        {activeProjectPath && (
          <div className="h-[160px] shrink-0">
            <MemoryPanel onSelectItem={setSelected} />
          </div>
        )}
      </div>

      {/* 인라인 디테일 패널 — 넓은 화면, 항목 선택 시 */}
      {isWide && selected && (
        <div className="relative w-[400px] shrink-0 border-l border-border flex flex-col overflow-hidden">
          {/* MCP panel renders its own close button in header flex flow */}
          {selected.type !== "mcp" && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10"
              onClick={() => setSelected(null)}
            >
              <XIcon className="size-4" />
            </Button>
          )}
          <DetailPanelContent
            target={selected}
            activeProjectPath={activeProjectPath}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* Sheet — 좁은 화면에서만 */}
      {!isWide && (
        <DashboardDetailSheet
          target={selected}
          onClose={() => setSelected(null)}
          activeProjectPath={activeProjectPath}
        />
      )}
    </div>
  )
}

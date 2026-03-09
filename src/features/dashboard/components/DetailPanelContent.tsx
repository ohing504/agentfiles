// src/features/dashboard/components/DetailPanelContent.tsx
import { HookDetailPanel } from "@/components/HookDetailPanel"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { PluginDetailPanel } from "@/components/PluginDetailPanel"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import { AgentDetailPanel } from "@/features/agents-editor/components/AgentDetailPanel"
import type { DashboardDetailTarget } from "../types"
import { MemoryDetailPanel } from "./MemoryDetailPanel"

interface DetailPanelContentProps {
  target: DashboardDetailTarget
  activeProjectPath?: string | null
  onClose?: () => void
}

export function DetailPanelContent({
  target,
  activeProjectPath,
  onClose,
}: DetailPanelContentProps) {
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

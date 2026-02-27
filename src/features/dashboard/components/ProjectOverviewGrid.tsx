// src/features/dashboard/components/ProjectOverviewGrid.tsx
import { AgentsPanel } from "./AgentsPanel"
import { HooksPanel } from "./HooksPanel"
import { LspServersPanel } from "./LspServersPanel"
import { McpDirectPanel } from "./McpDirectPanel"
import { PluginsPanel } from "./PluginsPanel"
import { SkillsPanel } from "./SkillsPanel"

export function ProjectOverviewGrid() {
  return (
    <div className="h-full p-3 flex flex-col gap-3 overflow-hidden">
      {/* Top row — main panels, flex-1 to fill available height */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        <PluginsPanel />
        <McpDirectPanel />
        <SkillsPanel />
      </div>
      {/* Bottom row — secondary panels, fixed height */}
      <div className="grid grid-cols-3 gap-3 h-[160px] shrink-0">
        <HooksPanel />
        <AgentsPanel />
        <LspServersPanel />
      </div>
    </div>
  )
}

import { HookDetailPanel } from "@/components/HookDetailPanel"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { PluginDetailPanel } from "@/components/PluginDetailPanel"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AgentDetailPanel } from "@/features/agents-editor/components/AgentDetailPanel"
import type { DashboardDetailTarget } from "../types"

interface DashboardDetailSheetProps {
  target: DashboardDetailTarget
  onClose: () => void
  activeProjectPath?: string | null
}

export function DashboardDetailSheet({
  target,
  onClose,
  activeProjectPath,
}: DashboardDetailSheetProps) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-[480px] p-0 flex flex-col"
      >
        {target?.type === "plugin" && (
          <PluginDetailPanel plugin={target.plugin} />
        )}
        {target?.type === "skill" && <SkillDetailPanel skill={target.skill} />}
        {target?.type === "agent" && <AgentDetailPanel agent={target.agent} />}
        {target?.type === "mcp" && <McpDetailPanel server={target.server} />}
        {target?.type === "hook" && (
          <HookDetailPanel
            hook={target.hook}
            event={target.event}
            matcher={target.matcher}
            activeProjectPath={activeProjectPath}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

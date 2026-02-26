import type { AgentFile, SupportingFile } from "@/shared/types"

export interface SkillSelection {
  skill: AgentFile | null
  supportingFile: SupportingFile | null
  expandedSkillPath: string | null
}

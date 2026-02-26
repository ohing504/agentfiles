import { SkillDetailView } from "@/components/SkillDetailView"
import { useSkillsSelection } from "../context/SkillsContext"

export function SkillDetailPanel() {
  const { selectedSkill: skill } = useSkillsSelection()

  if (!skill) return null

  return <SkillDetailView skill={skill} />
}

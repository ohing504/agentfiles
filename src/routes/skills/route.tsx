import { createFileRoute } from "@tanstack/react-router"
import { SkillsPageContent } from "@/features/skills-editor/components/SkillsPageContent"

export const Route = createFileRoute("/skills")({
  component: SkillsPageContent,
})

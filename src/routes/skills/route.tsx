import { createFileRoute } from "@tanstack/react-router"
import { SkillsPage } from "@/features/skills-editor/components/SkillsPage"

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
})

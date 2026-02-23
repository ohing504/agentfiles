import { createFileRoute } from "@tanstack/react-router"
import { SkillsPageContent } from "@/components/pages/SkillsPageContent"

export const Route = createFileRoute("/skills")({
  component: SkillsPageContent,
})

import { createFileRoute } from "@tanstack/react-router"
import { HooksPageContent } from "@/components/features/hooks-editor/components/HooksPageContent"

export const Route = createFileRoute("/hooks")({
  component: HooksPageContent,
})

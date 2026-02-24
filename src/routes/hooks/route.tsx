import { createFileRoute } from "@tanstack/react-router"
import { HooksPageContent } from "@/features/hooks-editor/components/HooksPageContent"

export const Route = createFileRoute("/hooks")({
  component: HooksPageContent,
})

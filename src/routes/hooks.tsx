import { createFileRoute } from "@tanstack/react-router"
import { HooksPageContent } from "@/components/pages/HooksPageContent"

export const Route = createFileRoute("/hooks")({
  component: HooksPageContent,
})

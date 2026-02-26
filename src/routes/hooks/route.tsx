import { createFileRoute } from "@tanstack/react-router"
import { HooksPage } from "@/features/hooks-editor/components/HooksPage"

export const Route = createFileRoute("/hooks")({
  component: HooksPage,
})

import { createFileRoute } from "@tanstack/react-router"
import { FilesPageContent } from "@/components/pages/FilesPageContent"

export const Route = createFileRoute("/project/files")({
  component: () => <FilesPageContent scope="project" />,
})

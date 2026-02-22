import { createFileRoute } from "@tanstack/react-router"
import { FilesPageContent } from "@/components/pages/FilesPageContent"

export const Route = createFileRoute("/global/files")({
  component: () => <FilesPageContent scope="global" />,
})

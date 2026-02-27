import { createFileRoute } from "@tanstack/react-router"
import { FilesPage } from "@/features/files-editor/components/FilesPage"

export const Route = createFileRoute("/files")({
  component: FilesPage,
})

import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/project/files")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})

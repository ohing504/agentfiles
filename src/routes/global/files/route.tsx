import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/global/files")({
  beforeLoad: () => {
    throw redirect({ to: "/files" })
  },
})

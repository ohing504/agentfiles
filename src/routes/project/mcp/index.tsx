import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/project/mcp/")({
  beforeLoad: () => {
    throw redirect({ to: "/mcp" })
  },
  component: () => null,
})

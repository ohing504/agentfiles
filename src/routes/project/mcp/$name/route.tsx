import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/project/mcp/$name")({
  beforeLoad: () => {
    throw redirect({ to: "/mcp" })
  },
  component: () => null,
})

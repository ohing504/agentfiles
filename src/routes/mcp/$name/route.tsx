import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/mcp/$name")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/global/mcp/$name", params: { name: params.name } })
  },
  component: () => null,
})

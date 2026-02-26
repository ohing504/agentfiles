import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/project/plugins/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/plugins" })
  },
  component: () => null,
})

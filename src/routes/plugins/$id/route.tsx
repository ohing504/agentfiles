import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/plugins/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/plugins" })
  },
  component: () => null,
})

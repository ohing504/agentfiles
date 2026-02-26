import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/global/plugins/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/plugins" })
  },
  component: () => null,
})

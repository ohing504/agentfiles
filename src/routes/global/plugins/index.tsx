import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/global/plugins/")({
  beforeLoad: () => {
    throw redirect({ to: "/plugins" })
  },
  component: () => null,
})

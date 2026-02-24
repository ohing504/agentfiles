import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/plugins/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/global/plugins/$id", params: { id: params.id } })
  },
  component: () => null,
})

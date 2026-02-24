import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/global")({
  component: () => <Outlet />,
})

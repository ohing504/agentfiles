import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/project/settings")({
  component: () => <Navigate to="/settings" />,
})

import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/global/settings")({
  component: () => <Navigate to="/settings" />,
})

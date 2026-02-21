import { createFileRoute } from "@tanstack/react-router"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/plugins")({ component: PluginsPage })

function PluginsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{m.nav_plugins()}</h1>
      <p className="text-muted-foreground">{m.app_coming_soon()}</p>
    </div>
  )
}

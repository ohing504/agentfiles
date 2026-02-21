import { createFileRoute, Link } from "@tanstack/react-router"
import { Bot, FileText, Puzzle, Server, Sparkles, Terminal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/")({ component: DashboardPage })

const cards = [
  { to: "/plugins", icon: Puzzle, labelFn: () => m.nav_plugins(), count: 0 },
  { to: "/mcp", icon: Server, labelFn: () => m.nav_mcp_servers(), count: 0 },
  { to: "/agents", icon: Bot, labelFn: () => m.nav_agents(), count: 0 },
  {
    to: "/commands",
    icon: Terminal,
    labelFn: () => m.nav_commands(),
    count: 0,
  },
  { to: "/skills", icon: Sparkles, labelFn: () => m.nav_skills(), count: 0 },
  {
    to: "/claude-md",
    icon: FileText,
    labelFn: () => m.nav_claude_md(),
    count: 0,
  },
] as const

function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{m.nav_dashboard()}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, labelFn, count }) => (
          <Link key={to} to={to}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">{labelFn()}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{count}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

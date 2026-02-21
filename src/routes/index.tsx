import { createFileRoute, Link } from '@tanstack/react-router'
import { Bot, FileText, Puzzle, Server, Sparkles, Terminal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: DashboardPage })

const cards = [
  { to: '/plugins', icon: Puzzle, label: 'Plugins', count: 0 },
  { to: '/mcp', icon: Server, label: 'MCP Servers', count: 0 },
  { to: '/agents', icon: Bot, label: 'Agents', count: 0 },
  { to: '/commands', icon: Terminal, label: 'Commands', count: 0 },
  { to: '/skills', icon: Sparkles, label: 'Skills', count: 0 },
  { to: '/claude-md', icon: FileText, label: 'CLAUDE.md', count: 0 },
]

function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, label, count }) => (
          <Link key={to} to={to}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
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

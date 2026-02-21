import { Link } from '@tanstack/react-router'
import {
  Bot,
  FileText,
  LayoutDashboard,
  Puzzle,
  Server,
  Sparkles,
  Terminal,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/claude-md', icon: FileText, label: 'CLAUDE.md' },
  { to: '/plugins', icon: Puzzle, label: 'Plugins' },
  { to: '/mcp', icon: Server, label: 'MCP Servers' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/commands', icon: Terminal, label: 'Commands' },
  { to: '/skills', icon: Sparkles, label: 'Skills' },
]

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-muted/50 border-r flex flex-col">
      <div className="p-4 border-b">
        <span className="font-bold text-lg">agentfiles</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted"
            activeProps={{
              className:
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-muted font-medium',
            }}
            activeOptions={to === '/' ? { exact: true } : undefined}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

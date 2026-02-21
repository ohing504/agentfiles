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

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { m } from '@/paraglide/messages'

const navItems = [
  { to: '/', icon: LayoutDashboard, labelFn: () => m.nav_dashboard() },
  { to: '/claude-md', icon: FileText, labelFn: () => m.nav_claude_md() },
  { to: '/plugins', icon: Puzzle, labelFn: () => m.nav_plugins() },
  { to: '/mcp', icon: Server, labelFn: () => m.nav_mcp_servers() },
  { to: '/agents', icon: Bot, labelFn: () => m.nav_agents() },
  { to: '/commands', icon: Terminal, labelFn: () => m.nav_commands() },
  { to: '/skills', icon: Sparkles, labelFn: () => m.nav_skills() },
] as const

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-muted/50 border-r flex flex-col">
      <div className="p-4 border-b">
        <span className="font-bold text-lg">{m.app_name()}</span>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ to, icon: Icon, labelFn }) => (
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
            {labelFn()}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t">
        <LanguageSwitcher />
      </div>
    </aside>
  )
}

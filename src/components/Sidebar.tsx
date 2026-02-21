import { Link } from "@tanstack/react-router"
import {
  Bot,
  FileText,
  LayoutDashboard,
  Puzzle,
  Server,
  Sparkles,
  Terminal,
} from "lucide-react"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ProjectSwitcher } from "@/components/ProjectSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"

const navItems = [
  { to: "/", icon: LayoutDashboard, labelFn: () => m.nav_dashboard() },
  { to: "/claude-md", icon: FileText, labelFn: () => m.nav_claude_md() },
  { to: "/plugins", icon: Puzzle, labelFn: () => m.nav_plugins() },
  { to: "/mcp", icon: Server, labelFn: () => m.nav_mcp_servers() },
  { to: "/agents", icon: Bot, labelFn: () => m.nav_agents() },
  { to: "/commands", icon: Terminal, labelFn: () => m.nav_commands() },
  { to: "/skills", icon: Sparkles, labelFn: () => m.nav_skills() },
] as const

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_group_label()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, icon: Icon, labelFn }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={labelFn()}>
                    <Link
                      to={to}
                      activeProps={{
                        "data-active": true,
                      }}
                      activeOptions={to === "/" ? { exact: true } : undefined}
                    >
                      <Icon />
                      <span>{labelFn()}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <LanguageSwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import { Link } from "@tanstack/react-router"
import {
  FolderOpen,
  LayoutDashboard,
  PanelLeftIcon,
  Puzzle,
  ScrollText,
  Server,
  Settings,
  Zap,
} from "lucide-react"

import { useProjectContext } from "@/components/ProjectContext"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"

const globalNavItems = [
  {
    to: "/global/settings",
    icon: Settings,
    labelFn: () => m.nav_settings(),
  },
  { to: "/global/files", icon: FolderOpen, labelFn: () => m.nav_files() },
  { to: "/global/plugins", icon: Puzzle, labelFn: () => m.nav_plugins() },
  {
    to: "/global/mcp",
    icon: Server,
    labelFn: () => m.nav_mcp_servers(),
  },
] as const

const projectNavItems = [
  {
    to: "/project/settings",
    icon: Settings,
    labelFn: () => m.nav_settings(),
  },
  { to: "/project/files", icon: FolderOpen, labelFn: () => m.nav_files() },
  {
    to: "/project/plugins",
    icon: Puzzle,
    labelFn: () => m.nav_plugins(),
  },
  {
    to: "/project/mcp",
    icon: Server,
    labelFn: () => m.nav_mcp_servers(),
  },
] as const

function SidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggleSidebar}
          tooltip="Toggle Sidebar"
          className="w-8"
        >
          <PanelLeftIcon />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { activeProjectPath } = useProjectContext()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard, Skills, Hooks */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_dashboard()}>
                  <Link
                    to="/"
                    activeProps={{ "data-active": true }}
                    activeOptions={{ exact: true }}
                  >
                    <LayoutDashboard />
                    <span>{m.nav_dashboard()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_skills()}>
                  <Link to="/skills" activeProps={{ "data-active": true }}>
                    <ScrollText />
                    <span>{m.nav_skills()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Hooks">
                  <Link to="/hooks" activeProps={{ "data-active": true }}>
                    <Zap />
                    <span>Hooks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Global */}
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_group_global()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {globalNavItems.map(({ to, icon: Icon, labelFn }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={labelFn()}>
                    <Link to={to} activeProps={{ "data-active": true }}>
                      <Icon />
                      <span>{labelFn()}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Project (only when a project is selected) */}
        {activeProjectPath && (
          <SidebarGroup>
            <SidebarGroupLabel>{m.nav_group_project()}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map(({ to, icon: Icon, labelFn }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={labelFn()}>
                      <Link to={to} activeProps={{ "data-active": true }}>
                        <Icon />
                        <span>{labelFn()}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

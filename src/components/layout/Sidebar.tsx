import { Link } from "@tanstack/react-router"
import {
  FolderOpen,
  LayoutDashboard,
  PanelLeftIcon,
  Plug2Icon,
  ScrollText,
  Server,
  SettingsIcon,
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
  { to: "/global/files", icon: FolderOpen, labelFn: () => m.nav_files() },
] as const

const projectNavItems = [
  { to: "/project/files", icon: FolderOpen, labelFn: () => m.nav_files() },
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
        {/* Dashboard, Skills, Hooks, MCP, Plugins, Configuration */}
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_mcp_servers()}>
                  <Link to="/mcp" activeProps={{ "data-active": true }}>
                    <Server />
                    <span>{m.nav_mcp_servers()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_plugins()}>
                  <Link to="/plugins" activeProps={{ "data-active": true }}>
                    <Plug2Icon />
                    <span>{m.nav_plugins()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.config_title()}>
                  <Link
                    to="/global/settings"
                    activeProps={{ "data-active": true }}
                  >
                    <SettingsIcon />
                    <span>{m.config_title()}</span>
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

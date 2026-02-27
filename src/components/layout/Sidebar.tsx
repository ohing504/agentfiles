import { Link } from "@tanstack/react-router"
import {
  FolderOpenIcon,
  LayoutDashboardIcon,
  PanelLeftIcon,
  Plug2Icon,
  ScrollTextIcon,
  ServerIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react"

import { ProjectSwitcher } from "@/components/ProjectSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"

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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
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
                    <LayoutDashboardIcon />
                    <span>{m.nav_dashboard()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_files()}>
                  <Link to="/files" activeProps={{ "data-active": true }}>
                    <FolderOpenIcon />
                    <span>{m.nav_files()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_skills()}>
                  <Link to="/skills" activeProps={{ "data-active": true }}>
                    <ScrollTextIcon />
                    <span>{m.nav_skills()}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Hooks">
                  <Link to="/hooks" activeProps={{ "data-active": true }}>
                    <ZapIcon />
                    <span>Hooks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={m.nav_mcp_servers()}>
                  <Link to="/mcp" activeProps={{ "data-active": true }}>
                    <ServerIcon />
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

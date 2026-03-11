import { Link } from "@tanstack/react-router"
import { LayoutDashboardIcon, PanelLeftIcon, SettingsIcon } from "lucide-react"

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
                <SidebarMenuButton asChild tooltip={m.config_title()}>
                  <Link to="/settings" activeProps={{ "data-active": true }}>
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

import { AppSidebar } from "@/components/layout/Sidebar"
import { StatusBar } from "@/components/layout/StatusBar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-svh flex-col overflow-hidden"
      style={{ "--status-bar-height": "1.5rem" } as React.CSSProperties}
    >
      <SidebarProvider className="flex-1 min-h-0">
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <div className="flex-1 overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <StatusBar />
    </div>
  )
}

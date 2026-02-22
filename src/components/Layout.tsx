import { Link, useLocation } from "@tanstack/react-router"
import React from "react"

import { AppSidebar } from "@/components/Sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"

const ROUTE_LABELS: Record<string, () => string> = {
  files: () => m.nav_files(),
  plugins: () => m.nav_plugins(),
  mcp: () => m.nav_mcp_servers(),
}

function buildBreadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const items: Array<{ label: string; href?: string }> = []

  if (segments.length === 0) {
    items.push({ label: m.nav_dashboard() })
    return items
  }

  const labelFn = ROUTE_LABELS[segments[0]]
  if (!labelFn) return items

  if (segments.length === 1) {
    items.push({ label: labelFn() })
  } else {
    items.push({ label: labelFn(), href: `/${segments[0]}` })
    items.push({ label: decodeURIComponent(segments[1]) })
  }

  return items
}

function HeaderBreadcrumb() {
  const location = useLocation()
  const items = buildBreadcrumbItems(location.pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumb items are positional
            <React.Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <div aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <HeaderBreadcrumb />
        </header>
        <div className="flex-1 overflow-y-auto p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

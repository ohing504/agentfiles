import { Link, useLocation } from "@tanstack/react-router"
import React from "react"

import { AppSidebar } from "@/components/Sidebar"
import { StatusBar } from "@/components/StatusBar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"

const SCOPE_LABELS: Record<string, () => string> = {
  global: () => m.nav_group_global(),
  project: () => m.nav_group_project(),
}

const ROUTE_LABELS: Record<string, () => string> = {
  settings: () => m.nav_settings(),
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

  // /hooks, /skills 는 자체 타이틀이 있으므로 브레드크럼 불필요
  if (segments[0] === "hooks" || segments[0] === "skills") {
    return items
  }

  // /global/... or /project/...
  const scopeLabel = SCOPE_LABELS[segments[0]]
  if (!scopeLabel) return items

  const routeLabel = segments[1] ? ROUTE_LABELS[segments[1]] : undefined

  if (!routeLabel) {
    items.push({ label: scopeLabel() })
    return items
  }

  if (segments.length === 2) {
    // /global/files → "Global > Files"
    items.push({ label: scopeLabel() })
    items.push({ label: routeLabel() })
  } else {
    // /global/plugins/some-id → "Global > Plugins > some-id"
    items.push({ label: scopeLabel() })
    items.push({ label: routeLabel(), href: `/${segments[0]}/${segments[1]}` })
    items.push({ label: decodeURIComponent(segments[2]) })
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

function shouldShowHeader(pathname: string): boolean {
  const first = pathname.split("/").filter(Boolean)[0]
  return first !== "hooks" && first !== "skills"
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const showHeader = shouldShowHeader(location.pathname)

  return (
    <div
      className="flex h-svh flex-col overflow-hidden"
      style={{ "--status-bar-height": "1.5rem" } as React.CSSProperties}
    >
      <SidebarProvider className="flex-1 min-h-0">
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          {showHeader && (
            <header className="flex h-16 shrink-0 items-center gap-2 bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <HeaderBreadcrumb />
            </header>
          )}
          <div
            className={
              showHeader
                ? "flex-1 overflow-y-auto p-4"
                : "flex-1 overflow-hidden"
            }
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <StatusBar />
    </div>
  )
}

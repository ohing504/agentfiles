import { TanStackDevtools } from "@tanstack/react-devtools"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { AgentProvider } from "@/components/AgentContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Layout } from "@/components/layout/Layout"
import { ProjectProvider } from "@/components/ProjectContext"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getLocale } from "@/paraglide/runtime"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: "Manage your Claude Code agent configuration files",
      },
      {
        title: "agentfiles",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full antialiased">
        <TooltipProvider delayDuration={300}>
          <AgentProvider>
            <ProjectProvider>
              <ErrorBoundary>
                <Layout>{children}</Layout>
              </ErrorBoundary>
            </ProjectProvider>
          </AgentProvider>
        </TooltipProvider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}

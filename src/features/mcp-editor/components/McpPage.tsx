import { AlertTriangleIcon } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useSidebar } from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"
import { McpProvider } from "../context/McpContext"
import { McpPageContent } from "./McpPageContent"

function McpErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangleIcon className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">{m.mcp_render_error()}</p>
        <p className="text-xs text-muted-foreground">
          {m.mcp_render_error_desc()}
        </p>
      </div>
    </div>
  )
}

export function McpPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<McpErrorFallback />}>
      <McpProvider onSelect={() => setSidebarOpen(false)}>
        <McpPageContent />
      </McpProvider>
    </ErrorBoundary>
  )
}

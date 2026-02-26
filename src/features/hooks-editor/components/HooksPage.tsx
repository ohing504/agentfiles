import { AlertTriangle } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useSidebar } from "@/components/ui/sidebar"
import { HooksProvider } from "../context/HooksContext"
import { HooksPageContent } from "./HooksPageContent"

function HooksErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Failed to load Hooks editor</p>
        <p className="text-xs text-muted-foreground">
          Please try refreshing the page
        </p>
      </div>
    </div>
  )
}

export function HooksPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<HooksErrorFallback />}>
      <HooksProvider onSelect={() => setSidebarOpen(false)}>
        <HooksPageContent />
      </HooksProvider>
    </ErrorBoundary>
  )
}

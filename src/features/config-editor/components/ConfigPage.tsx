import { AlertTriangleIcon } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { m } from "@/paraglide/messages"
import { ConfigProvider } from "../context/ConfigContext"
import { ConfigPageContent } from "./ConfigPageContent"

function ConfigErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangleIcon className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">{m.config_render_error()}</p>
      </div>
    </div>
  )
}

export function ConfigPage() {
  return (
    <ErrorBoundary fallback={<ConfigErrorFallback />}>
      <ConfigProvider>
        <ConfigPageContent />
      </ConfigProvider>
    </ErrorBoundary>
  )
}

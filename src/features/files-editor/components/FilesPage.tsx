import { AlertTriangleIcon } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { m } from "@/paraglide/messages"
import { FilesProvider } from "../context/FilesContext"
import { FilesPageContent } from "./FilesPageContent"

function FilesErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangleIcon className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">{m.files_render_error()}</p>
      </div>
    </div>
  )
}

export function FilesPage() {
  return (
    <ErrorBoundary fallback={<FilesErrorFallback />}>
      <FilesProvider>
        <FilesPageContent />
      </FilesProvider>
    </ErrorBoundary>
  )
}

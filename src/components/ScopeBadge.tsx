import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { m } from "@/paraglide/messages"

interface ScopeBadgeProps {
  scope: "global" | "project" | "user"
  hasConflict?: boolean
}

const scopeLabelFn: Record<string, () => string> = {
  global: () => m.scope_global(),
  project: () => m.scope_project(),
  user: () => m.scope_user(),
}

const scopeStyles: Record<string, string> = {
  global:
    "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
  project:
    "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
  user: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/60",
}

export function ScopeBadge({ scope, hasConflict }: ScopeBadgeProps) {
  return (
    <Badge
      className={`${scopeStyles[scope]} inline-flex items-center gap-1 text-xs font-medium w-fit transition-colors`}
      variant="outline"
    >
      {scopeLabelFn[scope]()}
      {hasConflict && (
        <AlertTriangle className="w-3 h-3 ml-0.5 text-amber-500" />
      )}
    </Badge>
  )
}

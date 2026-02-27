import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { m } from "@/paraglide/messages"
import type { Scope } from "@/shared/types"

interface ScopeBadgeProps {
  scope: Scope
  hasConflict?: boolean
}

const scopeLabelFn: Record<string, () => string> = {
  project: () => m.scope_project(),
  user: () => m.scope_user(),
  local: () => m.scope_local(),
  managed: () => m.scope_managed(),
}

const scopeStyles: Record<string, string> = {
  project:
    "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
  user: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/60",
  local:
    "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
  managed:
    "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800/60",
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

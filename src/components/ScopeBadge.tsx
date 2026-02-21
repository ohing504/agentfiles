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

export function ScopeBadge({ scope, hasConflict }: ScopeBadgeProps) {
  const variantMap: Record<string, string> = {
    global: "bg-blue-100 text-blue-800 border-blue-200",
    project: "bg-green-100 text-green-800 border-green-200",
    user: "bg-purple-100 text-purple-800 border-purple-200",
  }

  return (
    <Badge
      className={`${variantMap[scope]} flex items-center gap-1 w-fit`}
      variant="outline"
    >
      {scopeLabelFn[scope]()}
      {hasConflict && <AlertTriangle className="w-3 h-3 ml-1" />}
    </Badge>
  )
}

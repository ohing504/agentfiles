import type { ReactNode } from "react"

// Display order for known scopes
const SCOPE_ORDER = ["user", "project", "local", "managed"]

const SCOPE_LABELS: Record<string, string> = {
  user: "User",
  project: "Project",
  local: "Local",
  managed: "Managed",
}

/**
 * Groups an array of items by their `scope` field.
 * Returns groups in canonical order (global → user → project → local → managed).
 */
export function groupByScope<T extends { scope: string }>(
  items: T[],
): { scope: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const arr = map.get(item.scope) ?? []
    arr.push(item)
    map.set(item.scope, arr)
  }

  const ordered = SCOPE_ORDER.filter((s) => map.has(s)).map((s) => ({
    scope: s,
    items: map.get(s) ?? [],
  }))

  // Append any unknown scopes in insertion order
  for (const [scope, scopeItems] of map) {
    if (!SCOPE_ORDER.includes(scope)) ordered.push({ scope, items: scopeItems })
  }

  return ordered
}

interface ScopeGroupProps {
  scope: string
  children: ReactNode
}

/**
 * Renders a subtle scope section header above its children.
 * Used inside dashboard panel lists to visually separate scope groups.
 */
export function ScopeGroup({ scope, children }: ScopeGroupProps) {
  const label = SCOPE_LABELS[scope] ?? scope
  return (
    <div>
      <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider first:pt-0.5">
        {label}
      </div>
      {children}
    </div>
  )
}

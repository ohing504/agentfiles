import { memo } from "react"
import { m } from "@/paraglide/messages"
import type { ConfigScope } from "../constants"

interface ConfigScopeTabsProps {
  scope: ConfigScope
  onScopeChange: (scope: ConfigScope) => void
  hasProject: boolean
}

const SCOPES: {
  id: ConfigScope
  labelKey: "config_scope_user" | "config_scope_project" | "config_scope_local"
}[] = [
  { id: "user", labelKey: "config_scope_user" },
  { id: "project", labelKey: "config_scope_project" },
  { id: "local", labelKey: "config_scope_local" },
]

export const ConfigScopeTabs = memo(function ConfigScopeTabs({
  scope,
  onScopeChange,
  hasProject,
}: ConfigScopeTabsProps) {
  return (
    <div className="flex border-b border-border">
      {SCOPES.map((s) => {
        const disabled = s.id !== "user" && !hasProject
        return (
          <button
            key={s.id}
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              scope === s.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() => !disabled && onScopeChange(s.id)}
            disabled={disabled}
            aria-label={`${s.id} scope`}
          >
            {m[s.labelKey]()}
          </button>
        )
      })}
    </div>
  )
})

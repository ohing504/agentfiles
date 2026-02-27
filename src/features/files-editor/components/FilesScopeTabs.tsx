import { memo } from "react"
import { m } from "@/paraglide/messages"
import type { FilesScope } from "../constants"

interface FilesScopeTabsProps {
  scope: FilesScope
  onScopeChange: (scope: FilesScope) => void
  hasProject: boolean
}

const SCOPES: {
  id: FilesScope
  labelKey: "files_scope_global" | "files_scope_project"
}[] = [
  { id: "global", labelKey: "files_scope_global" },
  { id: "project", labelKey: "files_scope_project" },
]

export const FilesScopeTabs = memo(function FilesScopeTabs({
  scope,
  onScopeChange,
  hasProject,
}: FilesScopeTabsProps) {
  return (
    <div className="flex border-b border-border">
      {SCOPES.map((s) => {
        const disabled = s.id === "project" && !hasProject
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

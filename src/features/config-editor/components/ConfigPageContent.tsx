import { ExternalLink } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useConfigMutations, useConfigQuery } from "../api/config.queries"
import { useConfigSelection } from "../context/ConfigContext"
import { ConfigCategoryNav } from "./ConfigCategoryNav"
import { ConfigScopeTabs } from "./ConfigScopeTabs"
import { ConfigSettingsPanel } from "./ConfigSettingsPanel"

export function ConfigPageContent() {
  const { activeProjectPath } = useProjectContext()
  const { scope, setScope, category, setCategory } = useConfigSelection()
  const { data: settings, isLoading } = useConfigQuery(scope)
  const { updateMutation, deleteMutation } = useConfigMutations(scope)

  const handleUpdate = (key: string, value: unknown) => {
    updateMutation.mutate({ key, value })
  }

  const handleDelete = (key: string) => {
    deleteMutation.mutate(key)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold">{m.config_title()}</h2>
        <a
          href={m.config_docs_url()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {m.common_docs()}
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Scope tabs */}
      <div className="shrink-0 px-4 pb-2">
        <ConfigScopeTabs
          scope={scope}
          onScopeChange={setScope}
          hasProject={!!activeProjectPath}
        />
      </div>

      {/* Category nav + Settings panel */}
      <div className="flex flex-1 min-h-0">
        <div className="w-[200px] shrink-0 border-r border-border p-3 overflow-y-auto">
          <ConfigCategoryNav
            category={category}
            onCategoryChange={setCategory}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <ConfigSettingsPanel
              category={category}
              settings={settings ?? {}}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  )
}

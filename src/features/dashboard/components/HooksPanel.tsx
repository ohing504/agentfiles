import { Zap } from "lucide-react"
import { useHooksQuery } from "@/features/hooks-editor/api/hooks.queries"
import type { HooksSettings } from "@/shared/types"
import { OverviewPanel } from "./OverviewPanel"
import { ScopeGroup } from "./ScopeGroup"

export function HooksPanel() {
  const { data: globalHooks = {} } = useHooksQuery("user")
  const { data: projectHooks = {} } = useHooksQuery("project")

  function hookEvents(hooks: HooksSettings): string[] {
    return Object.keys(hooks)
  }

  const globalEvents = hookEvents(globalHooks)
  const projectEvents = hookEvents(projectHooks)
  const totalCount = globalEvents.length + projectEvents.length

  return (
    <OverviewPanel title="Hooks" count={totalCount}>
      {totalCount === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No hooks</p>
      ) : (
        <div>
          {globalEvents.length > 0 && (
            <ScopeGroup scope="user">
              {globalEvents.map((event) => (
                <div
                  key={`global-${event}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
                >
                  <Zap className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{event}</span>
                </div>
              ))}
            </ScopeGroup>
          )}
          {projectEvents.length > 0 && (
            <ScopeGroup scope="project">
              {projectEvents.map((event) => (
                <div
                  key={`project-${event}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 cursor-default"
                >
                  <Zap className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{event}</span>
                </div>
              ))}
            </ScopeGroup>
          )}
        </div>
      )}
    </OverviewPanel>
  )
}

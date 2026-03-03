import { Zap } from "lucide-react"
import { ListItem } from "@/components/ui/list-item"
import { useHooksQuery } from "@/features/hooks-editor/api/hooks.queries"
import type { HooksSettings } from "@/shared/types"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"
import { ScopeGroup } from "./ScopeGroup"

interface HooksPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
  href?: string
}

function buildHookItems(hooks: HooksSettings) {
  return Object.entries(hooks).map(([event, groups]) => ({
    event,
    firstHook: groups?.[0]?.hooks?.[0],
    matcher: groups?.[0]?.matcher,
  }))
}

export function HooksPanel({ onSelectItem, href }: HooksPanelProps) {
  const { data: globalHooks = {} } = useHooksQuery("user")
  const { data: projectHooks = {} } = useHooksQuery("project")

  const globalItems = buildHookItems(globalHooks)
  const projectItems = buildHookItems(projectHooks)
  const totalCount = globalItems.length + projectItems.length

  return (
    <OverviewPanel title="Hooks" count={totalCount} href={href}>
      {totalCount === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No hooks</p>
      ) : (
        <div>
          {globalItems.length > 0 && (
            <ScopeGroup scope="user">
              {globalItems.map(({ event, firstHook, matcher }) => (
                <ListItem
                  key={`global-${event}`}
                  icon={Zap}
                  label={event}
                  trailing={
                    firstHook?.command ? (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px] font-mono">
                        {firstHook.command}
                      </span>
                    ) : undefined
                  }
                  onClick={() =>
                    firstHook &&
                    onSelectItem?.({
                      type: "hook",
                      hook: firstHook,
                      event,
                      matcher,
                    })
                  }
                />
              ))}
            </ScopeGroup>
          )}
          {projectItems.length > 0 && (
            <ScopeGroup scope="project">
              {projectItems.map(({ event, firstHook, matcher }) => (
                <ListItem
                  key={`project-${event}`}
                  icon={Zap}
                  label={event}
                  trailing={
                    firstHook?.command ? (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px] font-mono">
                        {firstHook.command}
                      </span>
                    ) : undefined
                  }
                  onClick={() =>
                    firstHook &&
                    onSelectItem?.({
                      type: "hook",
                      hook: firstHook,
                      event,
                      matcher,
                    })
                  }
                />
              ))}
            </ScopeGroup>
          )}
        </div>
      )}
    </OverviewPanel>
  )
}

import { FileCode, MessageSquare, Plus, Search, Zap } from "lucide-react"
import { useMemo, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useHooks } from "@/hooks/use-config"
import type {
  HookEntry,
  HookEventName,
  HookMatcherGroup,
  HooksSettings,
  Scope,
} from "@/shared/types"

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface SelectedHook {
  scope: Scope
  event: HookEventName
  groupIndex: number
  hookIndex: number
  hook: HookEntry
  matcher?: string
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function getHookDisplayName(hook: HookEntry): string {
  if (hook.type === "command" && hook.command) {
    const cmd = hook.command
      .replace(/"\$CLAUDE_PROJECT_DIR"\//g, "")
      .replace(/\$CLAUDE_PROJECT_DIR\//g, "")
    const parts = cmd.split("/")
    const last = parts[parts.length - 1]
    if (parts.length === 1 && cmd.length > 30) {
      return `${cmd.slice(0, 27)}...`
    }
    return last
  }
  if ((hook.type === "prompt" || hook.type === "agent") && hook.prompt) {
    return hook.prompt.length > 30
      ? `${hook.prompt.slice(0, 27)}...`
      : hook.prompt
  }
  return hook.type
}

function getHookIcon(hook: HookEntry): React.ElementType {
  switch (hook.type) {
    case "command":
      return FileCode
    case "prompt":
      return MessageSquare
    case "agent":
      return Zap
    default:
      return FileCode
  }
}

// ── HooksScopeSection ────────────────────────────────────────────────────────

function HooksScopeSection({
  label,
  scope,
  hooks,
  searchQuery,
  selectedHook,
  onSelectHook,
  onAddClick,
}: {
  label: string
  scope: Scope
  hooks: HooksSettings
  searchQuery: string
  selectedHook: SelectedHook | null
  onSelectHook: (hook: SelectedHook) => void
  onAddClick: () => void
}) {
  const eventEntries = Object.entries(hooks) as [
    HookEventName,
    HookMatcherGroup[],
  ][]

  // 검색 필터링이 적용된 이벤트 목록 계산
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return eventEntries.map(([event, groups]) => ({
        event,
        groups: groups.map((group, groupIndex) => ({
          group,
          groupIndex,
          hooks: group.hooks.map((hook, hookIndex) => ({ hook, hookIndex })),
        })),
      }))
    }

    const q = searchQuery.toLowerCase()
    return eventEntries
      .map(([event, groups]) => {
        const filteredGroups = groups
          .map((group, groupIndex) => {
            const filteredHooks = group.hooks
              .map((hook, hookIndex) => ({ hook, hookIndex }))
              .filter(({ hook }) => {
                const name = getHookDisplayName(hook).toLowerCase()
                const command = (hook.command ?? "").toLowerCase()
                const matcher = (group.matcher ?? "").toLowerCase()
                return (
                  name.includes(q) || command.includes(q) || matcher.includes(q)
                )
              })
            return { group, groupIndex, hooks: filteredHooks }
          })
          .filter(({ hooks }) => hooks.length > 0)
        return { event, groups: filteredGroups }
      })
      .filter(({ groups }) => groups.length > 0)
  }, [eventEntries, searchQuery])

  const hasHooks = eventEntries.length > 0

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center justify-center rounded p-0.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          aria-label={`Add hook to ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* 훅 목록 */}
      {!hasHooks ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">
          No hooks configured
        </p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">No results</p>
      ) : (
        <Tree>
          {filteredEvents.map(({ event, groups }) => {
            const totalCount = groups.reduce(
              (sum, { hooks }) => sum + hooks.length,
              0,
            )
            return (
              <TreeFolder
                key={event}
                icon={Zap}
                label={event}
                count={totalCount}
                defaultOpen
              >
                {groups.map(({ group, groupIndex, hooks: filteredHooks }) =>
                  filteredHooks.map(({ hook, hookIndex }) => {
                    const Icon = getHookIcon(hook)
                    const name = getHookDisplayName(hook)
                    const isSelected =
                      selectedHook?.scope === scope &&
                      selectedHook.event === event &&
                      selectedHook.groupIndex === groupIndex &&
                      selectedHook.hookIndex === hookIndex

                    return (
                      <TreeFile
                        key={`${groupIndex}-${hookIndex}`}
                        icon={Icon}
                        label={name}
                        selected={isSelected}
                        onClick={() =>
                          onSelectHook({
                            scope,
                            event,
                            groupIndex,
                            hookIndex,
                            hook,
                            matcher: group.matcher,
                          })
                        }
                      />
                    )
                  }),
                )}
              </TreeFolder>
            )
          })}
        </Tree>
      )}
    </div>
  )
}

// ── HooksPageContent ──────────────────────────────────────────────────────────

export function HooksPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [selectedHook, setSelectedHook] = useState<SelectedHook | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [_addDialogScope, setAddDialogScope] = useState<Scope | null>(null)

  const { query: globalQuery } = useHooks("global")
  const { query: projectQuery } = useHooks("project")

  const isLoading = globalQuery.isLoading || projectQuery.isLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const globalHooks: HooksSettings = globalQuery.data ?? {}
  const projectHooks: HooksSettings = projectQuery.data ?? {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* 좌측 패널 */}
      <div className="flex flex-col gap-4">
        {/* 타이틀 */}
        <h2 className="text-lg font-semibold">Hooks</h2>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hooks..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Global 섹션 */}
        <HooksScopeSection
          label="Global"
          scope="global"
          hooks={globalHooks}
          searchQuery={searchQuery}
          selectedHook={selectedHook}
          onSelectHook={setSelectedHook}
          onAddClick={() => setAddDialogScope("global")}
        />

        {/* Project 섹션 (activeProjectPath가 있을 때만) */}
        {activeProjectPath && (
          <HooksScopeSection
            label="Project"
            scope="project"
            hooks={projectHooks}
            searchQuery={searchQuery}
            selectedHook={selectedHook}
            onSelectHook={setSelectedHook}
            onAddClick={() => setAddDialogScope("project")}
          />
        )}
      </div>

      {/* 우측 패널 */}
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Zap className="size-8 opacity-30" />
          <span className="text-sm">Select a hook to view details</span>
        </div>
      </div>
    </div>
  )
}

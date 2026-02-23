import { useQuery } from "@tanstack/react-query"
import {
  FileCode,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useHooks } from "@/hooks/use-config"
import type {
  HookEntry,
  HookEventName,
  HookMatcherGroup,
  HooksSettings,
  HookType,
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

// ── HOOK_EVENT_META ───────────────────────────────────────────────────────────

const HOOK_EVENT_META: Record<
  HookEventName,
  { types: HookType[]; hasMatcher: boolean; matcherLabel?: string }
> = {
  SessionStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "startup/resume/clear/compact",
  },
  UserPromptSubmit: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
  },
  PreToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
  },
  PermissionRequest: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
  },
  PostToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
  },
  PostToolUseFailure: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
  },
  Notification: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "notification type",
  },
  SubagentStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "agent type",
  },
  SubagentStop: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "agent type",
  },
  Stop: { types: ["command", "prompt", "agent"], hasMatcher: false },
  TeammateIdle: { types: ["command"], hasMatcher: false },
  TaskCompleted: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
  },
  ConfigChange: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "config source",
  },
  WorktreeCreate: { types: ["command"], hasMatcher: false },
  WorktreeRemove: { types: ["command"], hasMatcher: false },
  PreCompact: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "manual/auto",
  },
  SessionEnd: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "exit reason",
  },
}

const ALL_EVENTS = Object.keys(HOOK_EVENT_META) as HookEventName[]

// ── HOOK_TEMPLATES ────────────────────────────────────────────────────────────

const HOOK_TEMPLATES: Array<{
  label: string
  event: HookEventName
  type: HookType
  matcher?: string
  command?: string
  timeout?: number
  prompt?: string
}> = [
  {
    label: "Auto Format (Biome)",
    event: "PostToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: "npx biome check --write",
  },
  {
    label: "File Guard",
    event: "PreToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: ".claude/hooks/pre-edit-guard.sh",
    timeout: 5,
  },
  {
    label: "Bash Guard",
    event: "PreToolUse",
    type: "command",
    matcher: "Bash",
    command: ".claude/hooks/pre-bash-guard.sh",
    timeout: 5,
  },
  {
    label: "Quality Gate",
    event: "Stop",
    type: "command",
    command: "pnpm typecheck",
  },
  {
    label: "Auto Test",
    event: "PostToolUse",
    type: "command",
    matcher: "Edit|Write",
    command: "npm test",
  },
]

// ── HookDetailPanel ───────────────────────────────────────────────────────────

function HookDetailPanel({
  selectedHook,
  activeProjectPath,
  onDelete,
}: {
  selectedHook: SelectedHook
  activeProjectPath: string | null | undefined
  onDelete: () => void
}) {
  const { hook } = selectedHook

  const isFilePath =
    hook.type === "command" && hook.command
      ? /\.(sh|py|js|ts)(\s|$|")/.test(hook.command) ||
        hook.command.includes("$CLAUDE_PROJECT_DIR") ||
        hook.command.startsWith(".claude/")
      : false

  const scriptQuery = useQuery({
    queryKey: ["hook-script", hook.command, activeProjectPath],
    queryFn: async () => {
      const { readScriptFn } = await import("@/server/hooks")
      return readScriptFn({
        data: {
          filePath: hook.command ?? "",
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    enabled: isFilePath && !!hook.command,
  })

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold truncate">
          {getHookDisplayName(hook)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete hook"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-center">
        <span className="text-muted-foreground">Event</span>
        <Badge variant="outline" className="w-fit">
          {selectedHook.event}
        </Badge>

        <span className="text-muted-foreground">Type</span>
        <Badge variant="secondary" className="w-fit">
          {hook.type}
        </Badge>

        {selectedHook.matcher && (
          <>
            <span className="text-muted-foreground">Matcher</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              {selectedHook.matcher}
            </code>
          </>
        )}

        {hook.timeout != null && (
          <>
            <span className="text-muted-foreground">Timeout</span>
            <span>{hook.timeout}s</span>
          </>
        )}

        {hook.type === "command" && hook.async != null && (
          <>
            <span className="text-muted-foreground">Async</span>
            <span>{hook.async ? "Yes" : "No"}</span>
          </>
        )}
      </div>

      {/* command 타입 */}
      {hook.type === "command" && hook.command && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Command
          </span>
          <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {hook.command}
          </pre>

          {isFilePath && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                Script Preview
              </span>
              {scriptQuery.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : scriptQuery.data?.content ? (
                <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre">
                  {scriptQuery.data.content}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  File not found or empty
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* prompt / agent 타입 */}
      {(hook.type === "prompt" || hook.type === "agent") && hook.prompt && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Prompt
          </span>
          <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {hook.prompt}
          </pre>

          {hook.model && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Model
              </span>
              <span className="text-sm">{hook.model}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AddHookDialog ─────────────────────────────────────────────────────────────

function AddHookDialog({
  scope: _scope,
  onClose,
  addMutation,
}: {
  scope: Scope
  onClose: () => void
  addMutation: ReturnType<typeof useHooks>["addMutation"]
}) {
  const [formEvent, setFormEvent] = useState<HookEventName>("PreToolUse")
  const [formType, setFormType] = useState<HookType>("command")
  const [formMatcher, setFormMatcher] = useState("")
  const [formCommand, setFormCommand] = useState("")
  const [formTimeout, setFormTimeout] = useState("")
  const [formAsync, setFormAsync] = useState(false)
  const [formPrompt, setFormPrompt] = useState("")
  const [formModel, setFormModel] = useState("")

  const meta = HOOK_EVENT_META[formEvent]

  function handleEventChange(event: HookEventName) {
    setFormEvent(event)
    const newMeta = HOOK_EVENT_META[event]
    if (!newMeta.types.includes(formType)) {
      setFormType(newMeta.types[0])
    }
  }

  function applyTemplate(tpl: (typeof HOOK_TEMPLATES)[number]) {
    setFormEvent(tpl.event)
    setFormType(tpl.type)
    setFormMatcher(tpl.matcher ?? "")
    setFormCommand(tpl.command ?? "")
    setFormTimeout(tpl.timeout != null ? String(tpl.timeout) : "")
    setFormAsync(false)
    setFormPrompt(tpl.prompt ?? "")
    setFormModel("")
  }

  function handleAdd() {
    const hookEntry: HookEntry = {
      type: formType,
      ...(formType === "command" && formCommand
        ? { command: formCommand }
        : {}),
      ...(formType !== "command" && formPrompt ? { prompt: formPrompt } : {}),
      ...(formModel ? { model: formModel } : {}),
      ...(formTimeout ? { timeout: Number(formTimeout) } : {}),
      ...(formType === "command" && formAsync ? { async: formAsync } : {}),
    }
    const matcherGroup: HookMatcherGroup = {
      hooks: [hookEntry],
      ...(formMatcher ? { matcher: formMatcher } : {}),
    }
    addMutation.mutate(
      { event: formEvent, matcherGroup },
      { onSuccess: () => onClose() },
    )
  }

  const canAdd =
    formType === "command"
      ? formCommand.trim() !== ""
      : formPrompt.trim() !== ""

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Hook</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Event */}
          <div className="flex flex-col gap-1.5">
            <Label>Event</Label>
            <Select
              value={formEvent}
              onValueChange={(v) => handleEventChange(v as HookEventName)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_EVENTS.map((ev) => (
                  <SelectItem key={ev} value={ev}>
                    {ev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={formType}
              onValueChange={(v) => setFormType(v as HookType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meta.types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Matcher (이벤트가 matcher 지원 시만) */}
          {meta.hasMatcher && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Matcher
                {meta.matcherLabel && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({meta.matcherLabel})
                  </span>
                )}
              </Label>
              <Input
                value={formMatcher}
                onChange={(e) => setFormMatcher(e.target.value)}
                placeholder={meta.matcherLabel ?? ""}
              />
            </div>
          )}

          {/* command 타입 필드 */}
          {formType === "command" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Command</Label>
                <Input
                  value={formCommand}
                  onChange={(e) => setFormCommand(e.target.value)}
                  placeholder="e.g. npx biome check --write"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Timeout (sec)</Label>
                <Input
                  type="number"
                  value={formTimeout}
                  onChange={(e) => setFormTimeout(e.target.value)}
                  placeholder="optional"
                  min={1}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="async-switch"
                  checked={formAsync}
                  onCheckedChange={setFormAsync}
                />
                <Label htmlFor="async-switch">Async</Label>
              </div>
            </>
          )}

          {/* prompt / agent 타입 필드 */}
          {(formType === "prompt" || formType === "agent") && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Prompt</Label>
                <Textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Enter prompt..."
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Model (optional)</Label>
                <Input
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="e.g. claude-opus-4-6"
                />
              </div>
            </>
          )}

          {/* Templates */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {HOOK_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canAdd || addMutation.isPending}
          >
            {addMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  const [addDialogScope, setAddDialogScope] = useState<Scope | null>(null)

  const {
    query: globalQuery,
    addMutation: globalAdd,
    removeMutation: globalRemove,
  } = useHooks("global")
  const {
    query: projectQuery,
    addMutation: projectAdd,
    removeMutation: projectRemove,
  } = useHooks("project")

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

  function handleDelete(hook: SelectedHook) {
    const mutation = hook.scope === "global" ? globalRemove : projectRemove
    mutation.mutate(
      {
        event: hook.event,
        groupIndex: hook.groupIndex,
        hookIndex: hook.hookIndex,
      },
      {
        onSuccess: () => setSelectedHook(null),
      },
    )
  }

  const addMutation = addDialogScope === "global" ? globalAdd : projectAdd

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
      {selectedHook ? (
        <HookDetailPanel
          selectedHook={selectedHook}
          activeProjectPath={activeProjectPath}
          onDelete={() => handleDelete(selectedHook)}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Zap className="size-8 opacity-30" />
            <span className="text-sm">Select a hook to view details</span>
          </div>
        </div>
      )}

      {/* Add Hook Dialog */}
      {addDialogScope != null && (
        <AddHookDialog
          scope={addDialogScope}
          onClose={() => setAddDialogScope(null)}
          addMutation={addMutation}
        />
      )}
    </div>
  )
}

import { useForm, useStore } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import {
  ExternalLink,
  FileCode,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react"
import { useMemo, useState } from "react"
import { z } from "zod"
import { useProjectContext } from "@/components/ProjectContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  detectLangFromPath,
  ShikiCodeBlock,
} from "@/components/ui/shiki-code-block"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useHooks } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type {
  HookEntry,
  HookEventName,
  HookMatcherGroup,
  HookScope,
  HooksSettings,
  HookType,
} from "@/shared/types"

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface SelectedHook {
  scope: HookScope
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
  {
    types: HookType[]
    hasMatcher: boolean
    matcherLabel?: string
    descFn: () => string
  }
> = {
  SessionStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "startup/resume/clear/compact",
    descFn: () => m.claude_hook_desc_SessionStart(),
  },
  UserPromptSubmit: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_UserPromptSubmit(),
  },
  PreToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PreToolUse(),
  },
  PermissionRequest: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PermissionRequest(),
  },
  PostToolUse: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PostToolUse(),
  },
  PostToolUseFailure: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "tool name",
    descFn: () => m.claude_hook_desc_PostToolUseFailure(),
  },
  Notification: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "notification type",
    descFn: () => m.claude_hook_desc_Notification(),
  },
  SubagentStart: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "agent type",
    descFn: () => m.claude_hook_desc_SubagentStart(),
  },
  SubagentStop: {
    types: ["command", "prompt", "agent"],
    hasMatcher: true,
    matcherLabel: "agent type",
    descFn: () => m.claude_hook_desc_SubagentStop(),
  },
  Stop: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_Stop(),
  },
  TeammateIdle: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_TeammateIdle(),
  },
  TaskCompleted: {
    types: ["command", "prompt", "agent"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_TaskCompleted(),
  },
  ConfigChange: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "config source",
    descFn: () => m.claude_hook_desc_ConfigChange(),
  },
  WorktreeCreate: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_WorktreeCreate(),
  },
  WorktreeRemove: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_WorktreeRemove(),
  },
  Setup: {
    types: ["command"],
    hasMatcher: false,
    descFn: () => m.claude_hook_desc_Setup(),
  },
  PreCompact: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "manual/auto",
    descFn: () => m.claude_hook_desc_PreCompact(),
  },
  SessionEnd: {
    types: ["command"],
    hasMatcher: true,
    matcherLabel: "exit reason",
    descFn: () => m.claude_hook_desc_SessionEnd(),
  },
}

// Lifecycle 순서로 정렬된 이벤트 그룹
const EVENT_GROUPS: { label: string; events: HookEventName[] }[] = [
  {
    label: "Session",
    events: ["SessionStart", "UserPromptSubmit"],
  },
  {
    label: "Tool",
    events: [
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
    ],
  },
  {
    label: "Agent",
    events: ["SubagentStart", "SubagentStop", "TaskCompleted"],
  },
  {
    label: "Response",
    events: ["Stop", "TeammateIdle", "PreCompact", "SessionEnd"],
  },
  {
    label: "Standalone",
    events: [
      "Notification",
      "ConfigChange",
      "WorktreeCreate",
      "WorktreeRemove",
    ],
  },
]

const HOOK_HANDLER_DESC: Record<HookType, () => string> = {
  command: () => m.claude_hook_handler_command(),
  prompt: () => m.claude_hook_handler_prompt(),
  agent: () => m.claude_hook_handler_agent(),
}

const HOOK_SCOPE_DESC: Record<HookScope, () => string> = {
  global: () => m.claude_hook_scope_global(),
  project: () => m.claude_hook_scope_project(),
  local: () => m.claude_hook_scope_local(),
}

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

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function HookDetailPanel({
  selectedHook,
  activeProjectPath,
}: {
  selectedHook: SelectedHook
  activeProjectPath: string | null | undefined
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
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* 메타 정보 — 가로 그리드, 각 항목은 수직 스택 */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        <DetailField label="Event">
          <span className="text-sm font-medium">{selectedHook.event}</span>
        </DetailField>

        <DetailField label="Handler">
          <span className="text-sm font-medium">{hook.type}</span>
        </DetailField>

        {selectedHook.matcher && (
          <DetailField label="Matcher">
            <span className="text-sm font-medium">{selectedHook.matcher}</span>
          </DetailField>
        )}

        {hook.timeout != null && (
          <DetailField label="Timeout">
            <span className="text-sm font-medium">{hook.timeout}s</span>
          </DetailField>
        )}

        {hook.type === "command" && hook.async != null && (
          <DetailField label="Async">
            <span className="text-sm font-medium">
              {hook.async ? "Yes" : "No"}
            </span>
          </DetailField>
        )}

        {hook.once && (
          <DetailField label="Once">
            <span className="text-sm font-medium">Yes</span>
          </DetailField>
        )}
      </dl>

      {/* Status Message */}
      {hook.statusMessage && (
        <DetailField label="Status Message">
          <span className="text-sm">{hook.statusMessage}</span>
        </DetailField>
      )}

      <Separator />

      {/* command 타입 */}
      {hook.type === "command" && hook.command && (
        <>
          <DetailField label="Command">
            <ShikiCodeBlock code={hook.command} lang="bash" />
          </DetailField>

          {isFilePath && (
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <dt className="text-xs text-muted-foreground">Script Preview</dt>
              <dd className="flex-1 min-h-0">
                {scriptQuery.isLoading ? (
                  <Skeleton className="h-24 w-full rounded-md" />
                ) : scriptQuery.data?.content ? (
                  <ShikiCodeBlock
                    code={scriptQuery.data.content}
                    lang={detectLangFromPath(hook.command ?? "")}
                    className="h-full overflow-y-auto [&_pre]:whitespace-pre [&_pre]:text-xs [&_pre]:h-full"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    File not found or empty
                  </p>
                )}
              </dd>
            </div>
          )}
        </>
      )}

      {/* prompt / agent 타입 */}
      {(hook.type === "prompt" || hook.type === "agent") && hook.prompt && (
        <>
          <div className="flex flex-col gap-1 flex-1 min-h-0">
            <dt className="text-xs text-muted-foreground">Prompt</dt>
            <dd className="flex-1 min-h-0">
              <ShikiCodeBlock
                code={hook.prompt}
                lang="markdown"
                className="h-full overflow-y-auto [&_pre]:h-full"
              />
            </dd>
          </div>

          {hook.model && (
            <DetailField label="Model">
              <span className="text-sm font-medium">{hook.model}</span>
            </DetailField>
          )}
        </>
      )}
    </div>
  )
}

// ── AddHookDialog ─────────────────────────────────────────────────────────────

const hookFormSchema = z.object({
  event: z.string().min(1),
  type: z.enum(["command", "prompt", "agent"]),
  matcher: z.string(),
  command: z.string(),
  prompt: z.string(),
  model: z.string(),
  timeout: z.string(),
  statusMessage: z.string(),
  async: z.boolean(),
  once: z.boolean(),
})

function AddHookDialog({
  scope,
  onClose,
  addMutation,
  removeMutation,
  editHook,
}: {
  scope: HookScope
  onClose: () => void
  addMutation: ReturnType<typeof useHooks>["addMutation"]
  removeMutation?: ReturnType<typeof useHooks>["removeMutation"]
  editHook?: SelectedHook | null
}) {
  const isEdit = !!editHook
  const form = useForm({
    defaultValues: {
      event: (editHook?.event ?? "PreToolUse") as string,
      type: (editHook?.hook.type ?? "command") as HookType,
      matcher: editHook?.matcher ?? "",
      command: editHook?.hook.command ?? "",
      prompt: editHook?.hook.prompt ?? "",
      model: editHook?.hook.model ?? "",
      timeout:
        editHook?.hook.timeout != null ? String(editHook.hook.timeout) : "",
      statusMessage: editHook?.hook.statusMessage ?? "",
      async: editHook?.hook.async ?? false,
      once: editHook?.hook.once ?? false,
    },
    validators: {
      onSubmit: hookFormSchema,
    },
    onSubmit: async ({ value }) => {
      const event = value.event as HookEventName
      const hookEntry: HookEntry = {
        type: value.type,
        ...(value.type === "command" && value.command
          ? { command: value.command }
          : {}),
        ...(value.type !== "command" && value.prompt
          ? { prompt: value.prompt }
          : {}),
        ...(value.model ? { model: value.model } : {}),
        ...(value.timeout ? { timeout: Number(value.timeout) } : {}),
        ...(value.type === "command" && value.async
          ? { async: value.async }
          : {}),
        ...(value.statusMessage ? { statusMessage: value.statusMessage } : {}),
        ...(value.once ? { once: value.once } : {}),
      }
      const matcherGroup: HookMatcherGroup = {
        hooks: [hookEntry],
        ...(value.matcher ? { matcher: value.matcher } : {}),
      }
      if (isEdit && editHook && removeMutation) {
        removeMutation.mutate(
          {
            event: editHook.event,
            groupIndex: editHook.groupIndex,
            hookIndex: editHook.hookIndex,
          },
          {
            onSuccess: () => {
              addMutation.mutate(
                { event, matcherGroup },
                { onSuccess: () => onClose() },
              )
            },
          },
        )
      } else {
        addMutation.mutate(
          { event, matcherGroup },
          { onSuccess: () => onClose() },
        )
      }
    },
  })

  const eventValue = useStore(
    form.store,
    (s) => s.values.event,
  ) as HookEventName
  const typeValue = useStore(form.store, (s) => s.values.type)
  const meta = HOOK_EVENT_META[eventValue]

  function handleEventChange(event: HookEventName) {
    form.setFieldValue("event", event)
    const newMeta = HOOK_EVENT_META[event]
    if (!newMeta.types.includes(typeValue)) {
      form.setFieldValue("type", newMeta.types[0])
    }
  }

  function applyTemplate(tpl: (typeof HOOK_TEMPLATES)[number]) {
    form.setFieldValue("event", tpl.event)
    form.setFieldValue("type", tpl.type)
    form.setFieldValue("matcher", tpl.matcher ?? "")
    form.setFieldValue("command", tpl.command ?? "")
    form.setFieldValue(
      "timeout",
      tpl.timeout != null ? String(tpl.timeout) : "",
    )
    form.setFieldValue("async", false)
    form.setFieldValue("prompt", tpl.prompt ?? "")
    form.setFieldValue("model", "")
    form.setFieldValue("statusMessage", "")
    form.setFieldValue("once", false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-4xl max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "Add"}{" "}
            <span className="text-primary">
              {scope.charAt(0).toUpperCase() + scope.slice(1)}
            </span>{" "}
            Hook
          </DialogTitle>
          <DialogDescription>{HOOK_SCOPE_DESC[scope]()}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="grid grid-cols-2 gap-6">
            {/* 좌측: Common Fields */}
            <FieldSet className="w-full">
              <FieldGroup>
                {/* Event */}
                <form.Field name="event">
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        Event <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(v) =>
                          handleEventChange(v as HookEventName)
                        }
                      >
                        <SelectTrigger className="h-auto!">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_GROUPS.map((group) => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.events.map((ev) => (
                                <SelectItem key={ev} value={ev}>
                                  <Item size="xs" className="w-full p-0">
                                    <ItemContent className="gap-0">
                                      <ItemTitle>{ev}</ItemTitle>
                                      <ItemDescription className="text-xs">
                                        {HOOK_EVENT_META[ev].descFn()}
                                      </ItemDescription>
                                    </ItemContent>
                                  </Item>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                {/* Hook Handler */}
                <form.Field name="type">
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        Hook Handler <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v as HookType)}
                      >
                        <SelectTrigger className="h-auto!">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {meta.types.map((t) => (
                              <SelectItem key={t} value={t} textValue={t}>
                                <Item size="xs" className="w-full p-0">
                                  <ItemContent className="gap-0">
                                    <ItemTitle>{t}</ItemTitle>
                                    <ItemDescription className="text-xs">
                                      {HOOK_HANDLER_DESC[t]()}
                                    </ItemDescription>
                                  </ItemContent>
                                </Item>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                {/* Timeout */}
                <form.Field name="timeout">
                  {(field) => (
                    <Field>
                      <FieldLabel>Timeout (sec)</FieldLabel>
                      <Input
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Default: cmd 600, prompt 30, agent 60"
                        min={1}
                      />
                    </Field>
                  )}
                </form.Field>

                {/* Status Message */}
                <form.Field name="statusMessage">
                  {(field) => (
                    <Field>
                      <FieldLabel>Status Message</FieldLabel>
                      <Input
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Custom spinner message"
                      />
                    </Field>
                  )}
                </form.Field>

                {/* Once */}
                <form.Field name="once">
                  {(field) => (
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor="once-switch">Once</FieldLabel>
                        <FieldDescription>
                          Run only once per session
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        id="once-switch"
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            {/* 우측: Handler-specific Fields */}
            <FieldSet className="w-full">
              <FieldGroup>
                {/* Matcher */}
                {meta.hasMatcher && (
                  <form.Field name="matcher">
                    {(field) => (
                      <Field>
                        <FieldLabel>Matcher</FieldLabel>
                        <Input
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={meta.matcherLabel ?? ""}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {/* command 타입 필드 */}
                {typeValue === "command" && (
                  <>
                    <form.Field name="command">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel>
                              Command{" "}
                              <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="e.g. npx biome check --write"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <form.Field name="async">
                      {(field) => (
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldLabel htmlFor="async-switch">
                              Async
                            </FieldLabel>
                            <FieldDescription>
                              Run hook without blocking execution
                            </FieldDescription>
                          </FieldContent>
                          <Switch
                            id="async-switch"
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </>
                )}

                {/* prompt / agent 타입 필드 */}
                {(typeValue === "prompt" || typeValue === "agent") && (
                  <>
                    <form.Field name="prompt">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel>
                              Prompt <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Textarea
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="Enter prompt..."
                              rows={4}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <form.Field name="model">
                      {(field) => (
                        <Field>
                          <FieldLabel>Model</FieldLabel>
                          <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="e.g. claude-opus-4-6"
                          />
                          <FieldDescription>Optional</FieldDescription>
                        </Field>
                      )}
                    </form.Field>
                  </>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* 하단: Templates */}
          <Separator className="my-2" />
          <Field>
            <FieldLabel>Templates</FieldLabel>
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
          </Field>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
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
  scope: HookScope
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
      <div className="flex items-center justify-between h-8 px-2">
        <span className="text-xs font-medium text-muted-foreground">
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
  const [addDialogScope, setAddDialogScope] = useState<HookScope | null>(null)
  const [editingHook, setEditingHook] = useState<SelectedHook | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SelectedHook | null>(null)

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
  const {
    query: localQuery,
    addMutation: localAdd,
    removeMutation: localRemove,
  } = useHooks("local")

  const isLoading =
    globalQuery.isLoading || projectQuery.isLoading || localQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const globalHooks: HooksSettings = globalQuery.data ?? {}
  const projectHooks: HooksSettings = projectQuery.data ?? {}
  const localHooks: HooksSettings = localQuery.data ?? {}

  function handleDelete(hook: SelectedHook) {
    const mutation =
      hook.scope === "global"
        ? globalRemove
        : hook.scope === "local"
          ? localRemove
          : projectRemove
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

  const addMutation =
    addDialogScope === "global"
      ? globalAdd
      : addDialogScope === "local"
        ? localAdd
        : projectAdd

  return (
    <div className="flex h-full">
      {/* 좌측 패널 */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        {/* 좌측 헤더 */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">Hooks</h2>
          <a
            href={m.claude_hook_docs_url()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
            <ExternalLink className="size-3" />
          </a>
        </div>
        {/* 검색 + 트리 */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hooks..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <HooksScopeSection
            label="Global"
            scope="global"
            hooks={globalHooks}
            searchQuery={searchQuery}
            selectedHook={selectedHook}
            onSelectHook={setSelectedHook}
            onAddClick={() => setAddDialogScope("global")}
          />
          {activeProjectPath && (
            <>
              <HooksScopeSection
                label="Project"
                scope="project"
                hooks={projectHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={setSelectedHook}
                onAddClick={() => setAddDialogScope("project")}
              />
              <HooksScopeSection
                label="Local"
                scope="local"
                hooks={localHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={setSelectedHook}
                onAddClick={() => setAddDialogScope("local")}
              />
            </>
          )}
        </div>
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedHook ? (
          <>
            {/* 우측 헤더 */}
            <div className="flex items-center justify-between px-4 h-12 shrink-0">
              <h2 className="text-sm font-semibold truncate min-w-0">
                {getHookDisplayName(selectedHook.hook)}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    {m.action_edit()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setEditingHook(selectedHook)}
                  >
                    <Pencil className="size-4" />
                    {m.action_edit()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingDelete(selectedHook)}
                  >
                    <Trash2 className="size-4" />
                    {m.action_delete()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* 상세 내용 */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <HookDetailPanel
                selectedHook={selectedHook}
                activeProjectPath={activeProjectPath}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Zap />
                </EmptyMedia>
                <EmptyTitle>No Hook Selected</EmptyTitle>
                <EmptyDescription>
                  Select a hook from the left panel to view its details.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hook? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  handleDelete(pendingDelete)
                  setPendingDelete(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Hook Dialog */}
      {addDialogScope != null && (
        <AddHookDialog
          scope={addDialogScope}
          onClose={() => setAddDialogScope(null)}
          addMutation={addMutation}
        />
      )}

      {/* Edit Hook Dialog */}
      {editingHook != null && (
        <AddHookDialog
          scope={editingHook.scope}
          onClose={() => setEditingHook(null)}
          addMutation={
            editingHook.scope === "global"
              ? globalAdd
              : editingHook.scope === "local"
                ? localAdd
                : projectAdd
          }
          removeMutation={
            editingHook.scope === "global"
              ? globalRemove
              : editingHook.scope === "local"
                ? localRemove
                : projectRemove
          }
          editHook={editingHook}
        />
      )}
    </div>
  )
}

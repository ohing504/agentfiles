import { useForm, useStore } from "@tanstack/react-form"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { useHooks } from "@/hooks/use-config"
import type {
  HookEntry,
  HookEventName,
  HookMatcherGroup,
  HookScope,
  HookType,
} from "@/shared/types"
import {
  EVENT_GROUPS,
  HOOK_EVENT_META,
  HOOK_HANDLER_DESC,
  HOOK_SCOPE_DESC,
  HOOK_TEMPLATES,
  hookFormSchema,
  type SelectedHook,
} from "../constants"

// ── AddHookDialog ────────────────────────────────────────────────────────────

export function AddHookDialog({
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

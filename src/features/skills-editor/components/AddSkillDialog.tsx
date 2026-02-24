import { useForm, useStore } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Scope } from "@/shared/types"
import { addSkillSchema } from "../constants"

export function AddSkillDialog({
  scope,
  activeProjectPath,
  onClose,
}: {
  scope: Scope
  activeProjectPath: string | null | undefined
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    validators: {
      onSubmit: addSkillSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const { createSkillFn } = await import("../api/skills.functions")
        await createSkillFn({
          data: {
            name: value.name,
            scope,
            description: value.description || undefined,
            projectPath: activeProjectPath ?? undefined,
          },
        })
        toast.success(`Skill '${value.name}' created`)
        await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
        onClose()
      } catch {
        toast.error("Failed to create skill")
      }
    },
  })

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
          <DialogDescription>
            Creates a new skill directory with SKILL.md template in{" "}
            {scope === "global" ? "~/.claude/skills/" : ".claude/skills/"}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup className="py-2">
            {/* Name field */}
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="my-skill"
                      className="text-sm"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    <FieldDescription>
                      Lowercase letters, numbers, and hyphens only. Max 64
                      characters.
                    </FieldDescription>
                  </Field>
                )
              }}
            </form.Field>

            {/* Description field */}
            <form.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Description <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What does this skill do?"
                      className="text-sm"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

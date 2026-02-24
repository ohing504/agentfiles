import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { AgentFile } from "@/shared/types"

// ── Utilities ─────────────────────────────────────────────────────────────────

export function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1].trim() : content
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const addSkillSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Name must be 64 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().min(1, "Description is required"),
})

// ── FrontmatterBadges ─────────────────────────────────────────────────────────

export function FrontmatterBadges({
  frontmatter,
}: {
  frontmatter: AgentFile["frontmatter"]
}) {
  if (!frontmatter) return null

  const entries: { label: string; value: string }[] = []
  if (frontmatter.model)
    entries.push({ label: "model", value: String(frontmatter.model) })
  if (frontmatter.context)
    entries.push({ label: "context", value: String(frontmatter.context) })
  if (frontmatter.agent)
    entries.push({ label: "agent", value: String(frontmatter.agent) })
  if (frontmatter["allowed-tools"])
    entries.push({
      label: "allowed-tools",
      value: String(frontmatter["allowed-tools"]),
    })
  if (frontmatter["argument-hint"])
    entries.push({
      label: "argument-hint",
      value: String(frontmatter["argument-hint"]),
    })
  if (frontmatter["disable-model-invocation"])
    entries.push({ label: "disable-model-invocation", value: "true" })
  if (frontmatter["user-invocable"] === false)
    entries.push({ label: "user-invocable", value: "false" })

  if (entries.length === 0) return null

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {entries.map((e) => {
          const values = e.value.includes(",")
            ? e.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
            : [e.value]
          return (
            <div key={e.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{e.label}</span>
              <div className="flex flex-wrap gap-1">
                {values.map((v) => (
                  <Badge key={v} variant="secondary">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <Separator className="mt-3" />
    </div>
  )
}

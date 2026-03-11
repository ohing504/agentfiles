import { z } from "zod"

// ── Utilities ─────────────────────────────────────────────────────────────────

export { extractBody } from "@/lib/format"

// ── Schemas ──────────────────────────────────────────────────────────────────

export const addSkillSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Name must be 64 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().min(1, "Description is required"),
})

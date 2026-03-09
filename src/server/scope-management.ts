import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export const moveOrCopyEntityFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: z.enum(["skill", "agent"]),
      name: z.string().min(1),
      from: z.enum(["user", "project"]),
      to: z.enum(["user", "project"]),
      mode: z.enum(["move", "copy"]),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { moveOrCopyEntity } = await import("@/services/scope-management")
    await moveOrCopyEntity(data)
    return { success: true }
  })

import { createServerFn } from "@tanstack/react-start"

export const getCliStatusFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { checkCliAvailable } = await import("@/services/claude-cli")
    return checkCliAvailable()
  },
)

import { createServerFn } from "@tanstack/react-start"

export const getMainAgentFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAgentfilesConfig } = await import("@/services/agentfiles-config")
    const config = await getAgentfilesConfig()
    return config.mainAgent
  },
)

export const setMainAgentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { agent: string }) => data)
  .handler(async ({ data }) => {
    const { setMainAgent } = await import("@/services/agentfiles-config")
    const { getAgentConfig } = await import("@/services/agent-registry")
    const config = getAgentConfig(data.agent as any)
    if (!config) throw new Error(`Unknown agent: ${data.agent}`)
    await setMainAgent(data.agent as any)
    return { success: true }
  })

export const getInstalledAgentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAgentRegistry } = await import("@/services/agent-registry")
    return getAgentRegistry()
  },
)

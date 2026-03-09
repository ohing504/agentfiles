import { describe, expect, it } from "vitest"
import {
  getAgentConfig,
  getAgentRegistry,
  getSupportedEntities,
} from "@/services/agent-registry"

describe("agent-registry", () => {
  it("returns all registered agents", () => {
    const agents = getAgentRegistry()
    expect(agents.length).toBeGreaterThanOrEqual(1)
    expect(agents[0].name).toBe("claude-code")
  })

  it("returns config for claude-code", () => {
    const config = getAgentConfig("claude-code")
    expect(config).toBeDefined()
    expect(config!.displayName).toBe("Claude Code")
    expect(config!.entities).toContain("skill")
    expect(config!.entities).toContain("plugin")
    expect(config!.entities).toContain("mcp")
    expect(config!.entities).toContain("hook")
    expect(config!.entities).toContain("agent")
  })

  it("returns undefined for unknown agent", () => {
    const config = getAgentConfig("unknown-agent" as any)
    expect(config).toBeUndefined()
  })

  it("returns supported entities for claude-code", () => {
    const entities = getSupportedEntities("claude-code")
    expect(entities).toContain("skill")
    expect(entities).toContain("plugin")
  })

  it("returns empty array for unknown agent entities", () => {
    const entities = getSupportedEntities("unknown" as any)
    expect(entities).toEqual([])
  })
})

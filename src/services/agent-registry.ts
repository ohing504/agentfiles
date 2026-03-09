import type { AgentConfig, AgentType, EntityType } from "@/shared/types"

const AGENT_REGISTRY: AgentConfig[] = [
  {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills",
    configDir: ".claude",
    globalConfigDir: "~/.claude",
    entities: ["skill", "agent", "hook", "plugin", "mcp"],
  },
]

export function getAgentRegistry(): AgentConfig[] {
  return AGENT_REGISTRY
}

export function getAgentConfig(name: AgentType): AgentConfig | undefined {
  return AGENT_REGISTRY.find((a) => a.name === name)
}

export function getSupportedEntities(name: AgentType): EntityType[] {
  return getAgentConfig(name)?.entities ?? []
}

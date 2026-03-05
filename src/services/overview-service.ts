import path from "node:path"
import { scanMdDirWithScope } from "@/services/agent-file-service"
import {
  getClaudeMd,
  getGlobalConfigPath,
  getProjectConfigPath,
} from "@/services/config-service"
import { getMcpServers } from "@/services/mcp-service"
import { getMemoryFiles } from "@/services/memory-service"
import { getPlugins } from "@/services/plugin-service"
import type { AgentFile, Overview } from "@/shared/types"

export async function getOverview(projectPath?: string): Promise<Overview> {
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  const [
    globalClaudeMd,
    projectClaudeMd,
    plugins,
    mcpServers,
    globalAgents,
    projectAgents,
    globalCommands,
    projectCommands,
    globalSkills,
    projectSkills,
  ] = await Promise.all([
    getClaudeMd("user"),
    getClaudeMd("project", projectPath),
    getPlugins(projectPath),
    getMcpServers(projectPath),
    scanMdDirWithScope(path.join(globalBase, "agents"), "agent", "user"),
    scanMdDirWithScope(path.join(projectBase, "agents"), "agent", "project"),
    scanMdDirWithScope(path.join(globalBase, "commands"), "command", "user"),
    scanMdDirWithScope(
      path.join(projectBase, "commands"),
      "command",
      "project",
    ),
    scanMdDirWithScope(path.join(globalBase, "skills"), "skill", "user"),
    scanMdDirWithScope(path.join(projectBase, "skills"), "skill", "project"),
  ])

  // 충돌 감지: 양쪽에 동일 name이 있는 항목 수
  function countConflicts(
    globalFiles: AgentFile[],
    projectFiles: AgentFile[],
  ): number {
    const globalNames = new Set(globalFiles.map((f) => f.name))
    return projectFiles.filter((f) => globalNames.has(f.name)).length
  }

  const conflictCount =
    countConflicts(globalAgents, projectAgents) +
    countConflicts(globalCommands, projectCommands) +
    countConflicts(globalSkills, projectSkills)

  const memoryFiles = projectPath ? await getMemoryFiles(projectPath) : []

  const globalMcpCount = mcpServers.filter((s) => s.scope === "user").length
  const projectMcpCount = mcpServers.filter((s) => s.scope === "project").length

  const userPluginCount = plugins.filter((p) => p.scope === "user").length
  const projectPluginCount = plugins.filter((p) => p.scope === "project").length

  return {
    claudeMd: {
      global: globalClaudeMd ?? undefined,
      project: projectClaudeMd ?? undefined,
    },
    plugins: {
      total: plugins.length,
      user: userPluginCount,
      project: projectPluginCount,
    },
    mcpServers: {
      total: mcpServers.length,
      global: globalMcpCount,
      project: projectMcpCount,
    },
    agents: {
      total: globalAgents.length + projectAgents.length,
      global: globalAgents.length,
      project: projectAgents.length,
    },
    commands: {
      total: globalCommands.length + projectCommands.length,
      global: globalCommands.length,
      project: projectCommands.length,
    },
    skills: {
      total: globalSkills.length + projectSkills.length,
      global: globalSkills.length,
      project: projectSkills.length,
    },
    conflictCount,
    memory: { total: memoryFiles.length },
  }
}

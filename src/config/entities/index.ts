import { registerEntity } from "@/config/entity-registry"
import { agentConfig } from "./agent-config"
import { fileConfig } from "./file-config"
import { hookConfig } from "./hook-config"
import { mcpConfig } from "./mcp-config"
import { memoryConfig } from "./memory-config"
import { pluginConfig } from "./plugin-config"
import { skillConfig } from "./skill-config"

// 모듈 import 시 자동 등록
registerEntity(skillConfig)
registerEntity(agentConfig)
registerEntity(hookConfig)
registerEntity(mcpConfig)
registerEntity(pluginConfig)
registerEntity(memoryConfig)
registerEntity(fileConfig)

export { agentConfig } from "./agent-config"
export type { FileItem } from "./file-config"
export { fileConfig } from "./file-config"
export type { HookItem } from "./hook-config"
export { hookConfig } from "./hook-config"
export { mcpConfig } from "./mcp-config"
export { memoryConfig } from "./memory-config"
export { pluginConfig } from "./plugin-config"
export { skillConfig } from "./skill-config"

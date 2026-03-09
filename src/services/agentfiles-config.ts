import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type {
  AgentfilesConfig,
  AgentType,
  BoardColumnId,
  BoardConfig,
} from "@/shared/types"

const CONFIG_PATH = path.join(os.homedir(), ".claude", "agentfiles.json")

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  columnOrder: [
    "files",
    "plugins",
    "mcp",
    "skills",
    "agents",
    "hooks",
    "memory",
    "lsp",
  ] as BoardColumnId[],
  hiddenColumns: ["lsp"] as BoardColumnId[],
}

const DEFAULT_CONFIG: AgentfilesConfig = {
  mainAgent: "claude-code",
  board: DEFAULT_BOARD_CONFIG,
}

export async function getAgentfilesConfig(): Promise<AgentfilesConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    const parsed = JSON.parse(content)
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      board: { ...DEFAULT_BOARD_CONFIG, ...parsed.board },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function setMainAgent(agent: AgentType): Promise<void> {
  const config = await getAgentfilesConfig()
  config.mainAgent = agent
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

export async function updateBoardConfig(
  partial: Partial<BoardConfig>,
): Promise<void> {
  const config = await getAgentfilesConfig()
  config.board = { ...config.board, ...partial }
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

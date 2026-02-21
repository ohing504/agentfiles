import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { ProjectsConfig } from "@/shared/types"

const CONFIG_PATH = path.join(os.homedir(), ".claude", "agentfiles.json")

export function getConfigPath(): string {
  return CONFIG_PATH
}

export async function readProjectsConfig(): Promise<ProjectsConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    return JSON.parse(content) as ProjectsConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { projects: [], activeProject: null }
    }
    throw err
  }
}

export async function writeProjectsConfig(
  config: ProjectsConfig,
): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".claude")
}

export function getProjectConfigPath(cwd?: string): string {
  return path.join(cwd ?? process.cwd(), ".claude")
}

export function generateToken(): string {
  return crypto.randomUUID()
}

export function findClaudeCli(): string | null {
  try {
    const result = execFileSync("which", ["claude"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    return result.trim() || null
  } catch {
    return null
  }
}

export function hasProjectConfig(cwd?: string): boolean {
  const configPath = getProjectConfigPath(cwd)
  try {
    return fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()
  } catch {
    return false
  }
}

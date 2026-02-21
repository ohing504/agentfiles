import fs from "node:fs"
import path from "node:path"

const INVALID_NAME_PATTERN = /[/\\]|\.{2}/

export function validateItemName(name: string): void {
  if (!name || INVALID_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid item name: ${name}`)
  }
}

export function validateProjectPath(projectPath: string): string {
  const resolved = path.resolve(projectPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Invalid project path: ${projectPath}`)
  }
  return resolved
}

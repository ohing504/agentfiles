import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export type ConfigScope = "user" | "project" | "local"

/**
 * Resolve the settings file path for a given scope.
 */
export function resolveSettingsPath(
  scope: ConfigScope,
  projectPath?: string,
): string {
  switch (scope) {
    case "user":
      return path.join(os.homedir(), ".claude", "settings.json")
    case "project":
      return path.join(projectPath ?? process.cwd(), ".claude", "settings.json")
    case "local":
      return path.join(
        projectPath ?? process.cwd(),
        ".claude",
        "settings.local.json",
      )
  }
}

/**
 * Read and parse a settings.json file. Returns {} if file doesn't exist.
 */
export async function readSettings(
  filePath: string,
): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Set a value at a dot-notation key path, deep-merging into existing data.
 * Example: writeSettingKey(fp, "sandbox.network.allowedDomains", ["x.com"])
 */
export async function writeSettingKey(
  filePath: string,
  key: string,
  value: unknown,
): Promise<void> {
  const data = await readSettings(filePath)
  setNestedValue(data, key, value)
  await writeSettingsFile(filePath, data)
}

/**
 * Remove a key at a dot-notation path.
 */
export async function deleteSettingKey(
  filePath: string,
  key: string,
): Promise<void> {
  const data = await readSettings(filePath)
  deleteNestedValue(data, key)
  await writeSettingsFile(filePath, data)
}

// ── Internal helpers ──

function setNestedValue(
  obj: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split(".")
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null ||
      Array.isArray(current[part])
    ) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function deleteNestedValue(obj: Record<string, unknown>, key: string): void {
  const parts = key.split(".")
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      return
    }
    current = current[part] as Record<string, unknown>
  }
  delete current[parts[parts.length - 1]]
}

async function writeSettingsFile(
  filePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8")
}

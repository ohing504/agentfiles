import fs from "node:fs/promises"
import path from "node:path"

export async function writeMarkdown(
  filePath: string,
  content: string,
): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

export async function createFile(
  basePath: string,
  name: string,
  content: string,
): Promise<string> {
  await fs.mkdir(basePath, { recursive: true })
  const filePath = path.join(basePath, `${name}.md`)
  await fs.writeFile(filePath, content, "utf-8")
  return filePath
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath)
}

export async function renameFile(
  oldPath: string,
  newPath: string,
): Promise<void> {
  const dir = path.dirname(newPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.rename(oldPath, newPath)
}

export async function writeSettingsJson(
  basePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(basePath, { recursive: true })
  const filePath = path.join(basePath, "settings.json")
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8")
}

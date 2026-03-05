import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { MemoryFile } from "@/shared/types"

export function projectPathToSlug(projectPath: string): string {
  return projectPath.replaceAll("/", "-")
}

export function getMemoryDir(projectPath: string): string {
  const slug = projectPathToSlug(projectPath)
  return path.join(os.homedir(), ".claude", "projects", slug, "memory")
}

export async function getMemoryFiles(
  projectPath: string,
): Promise<MemoryFile[]> {
  const memoryDir = getMemoryDir(projectPath)
  let entries: Dirent<string>[]
  try {
    entries = await fs.readdir(memoryDir, { withFileTypes: true })
  } catch {
    return []
  }
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"))
  const results = await Promise.all(
    mdFiles.map(async (entry) => {
      const filePath = path.join(memoryDir, entry.name)
      const [content, stat] = await Promise.all([
        fs.readFile(filePath, "utf-8"),
        fs.stat(filePath),
      ])
      return {
        name: entry.name,
        path: filePath,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        content,
      }
    }),
  )
  return results.sort((a, b) => {
    if (a.name === "MEMORY.md") return -1
    if (b.name === "MEMORY.md") return 1
    return a.name.localeCompare(b.name)
  })
}

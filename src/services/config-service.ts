import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { ClaudeMd, Scope } from "@/shared/types"

// ── 경로 헬퍼 ──

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".claude")
}

export function getProjectConfigPath(projectPath?: string): string {
  return path.join(projectPath ?? process.cwd(), ".claude")
}

// ── CLAUDE.md 읽기 ──

export async function getClaudeMd(
  scope: Scope,
  projectPath?: string,
): Promise<ClaudeMd | null> {
  const basePath =
    scope === "global"
      ? getGlobalConfigPath()
      : getProjectConfigPath(projectPath)
  const filePath = path.join(basePath, "CLAUDE.md")

  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ])

    return {
      scope,
      path: filePath,
      content,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw err
  }
}

// ── settings.json 파싱 헬퍼 ──

export async function readSettingsJson(
  basePath: string,
): Promise<Record<string, unknown>> {
  const settingsPath = path.join(basePath, "settings.json")
  try {
    const content = await fs.readFile(settingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function readClaudeAppJson(): Promise<Record<string, unknown>> {
  const claudeJsonPath = path.join(os.homedir(), ".claude.json")
  try {
    const content = await fs.readFile(claudeJsonPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function readProjectLocalSettings(
  projectPath?: string,
): Promise<Record<string, unknown>> {
  const basePath = getProjectConfigPath(projectPath)
  const localSettingsPath = path.join(basePath, "settings.local.json")
  try {
    const content = await fs.readFile(localSettingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── CLAUDE.md 재귀 탐색 (프로젝트 전체) ──

export interface ClaudeMdFile {
  relativePath: string // e.g., "src/CLAUDE.md"
  absolutePath: string
  size: number
  lastModified: string
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
  "__pycache__",
])

const MAX_SCAN_DEPTH = 5

export async function scanClaudeMdFiles(
  projectPath: string,
): Promise<ClaudeMdFile[]> {
  const results: ClaudeMdFile[] = []

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_SCAN_DEPTH) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "CLAUDE.md") {
        const fullPath = path.join(dir, entry.name)
        try {
          const stat = await fs.stat(fullPath)
          results.push({
            relativePath: path.relative(projectPath, fullPath),
            absolutePath: fullPath,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          })
        } catch {
          // skip unreadable files
        }
      } else if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), depth + 1)
      }
    }
  }

  await walk(projectPath, 0)
  return results
}

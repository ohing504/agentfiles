import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileNode[]
  size?: number
  extension?: string
}

export interface FileContent {
  content: string
  size: number
  lastModified: string
}

/** Names/patterns to exclude from the file tree. */
export const EXCLUDED_NAMES = new Set([
  // OS artifacts
  ".DS_Store",
  "Thumbs.db",
  // Large auto-generated dirs (performance)
  "cache",
  "debug",
  "file-history",
  // Claude internal infrastructure
  "teams",
  "tasks",
  "installed_plugins.json",
])

const EXCLUDED_EXTENSIONS = new Set([".db", ".lock", ".log"])

export function isExcluded(name: string): boolean {
  if (EXCLUDED_NAMES.has(name)) return true
  const ext = path.extname(name).toLowerCase()
  if (EXCLUDED_EXTENSIONS.has(ext)) return true
  if (name.startsWith(".") && name !== ".claude") return true
  return false
}

/** 프로젝트 루트에서 탐색할 Claude 관련 파일 목록 (순서 = 표시 순서) */
const ROOT_CLAUDE_FILES = ["CLAUDE.md", "AGENTS.md", ".agents", ".cursorrules"]

async function scanProjectClaudeFiles(projectPath: string): Promise<FileNode> {
  const children: FileNode[] = []

  // 1. 루트 레벨 Claude 파일 (존재하는 것만)
  for (const filename of ROOT_CLAUDE_FILES) {
    const filePath = path.join(projectPath, filename)
    try {
      const stat = await fs.stat(filePath)
      children.push({
        name: filename,
        path: filePath,
        type: "file",
        size: stat.size,
        extension: path.extname(filename).toLowerCase() || undefined,
      })
    } catch {
      // 파일 없음 → 스킵
    }
  }

  // 2. .claude 디렉토리 (존재하면 서브노드로 추가)
  const claudeDirPath = path.join(projectPath, ".claude")
  try {
    await fs.access(claudeDirPath)
    const claudeDir = await scanDir(claudeDirPath, ".claude")
    children.push(claudeDir)
  } catch {
    // .claude 없음 → 스킵
  }

  return {
    name: path.basename(projectPath),
    path: projectPath,
    type: "directory",
    children,
  }
}

export function resolveClaudeDir(
  scope: "global" | "project",
  projectPath?: string,
): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".claude")
  }
  return path.join(projectPath ?? process.cwd(), ".claude")
}

export async function scanClaudeDir(
  scope: "global" | "project",
  projectPath?: string,
): Promise<FileNode> {
  if (scope === "project") {
    return scanProjectClaudeFiles(projectPath ?? process.cwd())
  }

  // global scope: 기존 동작 유지 (~/.claude 스캔)
  const dirPath = resolveClaudeDir("global")
  const rootName = ".claude"

  try {
    await fs.access(dirPath)
  } catch {
    return { name: rootName, path: dirPath, type: "directory", children: [] }
  }

  return scanDir(dirPath, rootName)
}

async function scanDir(dirPath: string, name: string): Promise<FileNode> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  const children: FileNode[] = []
  for (const entry of entries) {
    if (isExcluded(entry.name)) continue

    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const child = await scanDir(entryPath, entry.name)
      children.push(child)
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      const stat = await fs.stat(entryPath)
      children.push({
        name: entry.name,
        path: entryPath,
        type: "file",
        size: stat.size,
        extension: path.extname(entry.name).toLowerCase() || undefined,
      })
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { name, path: dirPath, type: "directory", children }
}

export async function readFileContent(filePath: string): Promise<FileContent> {
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, "utf-8"),
    fs.stat(filePath),
  ])

  return {
    content,
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
  }
}

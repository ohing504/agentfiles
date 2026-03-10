import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import {
  getGlobalConfigPath,
  getProjectConfigPath,
} from "@/services/config-service"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"

// ── .md 파일 재귀 탐색 ──

export async function scanMdDir(
  basePath: string,
  type: AgentFile["type"],
): Promise<AgentFile[]> {
  const results: AgentFile[] = []

  async function walk(dir: string, namespace?: string): Promise<void> {
    let entries: Dirent[]

    try {
      entries = await fs.readdir(dir, {
        withFileTypes: true,
        encoding: "utf-8",
      })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return
      }
      throw err
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // 서브폴더명이 네임스페이스
        await walk(fullPath, entry.name)
      } else if (entry.isSymbolicLink()) {
        // symlink 처리
        if (entry.name.endsWith(".md")) {
          try {
            const [symlinkTarget, lstat, content] = await Promise.all([
              fs.readlink(fullPath),
              fs.lstat(fullPath),
              fs.readFile(fullPath, "utf-8").catch(() => ""),
            ])

            const parsed = matter(content)
            const name = entry.name.replace(/\.md$/, "")

            results.push({
              name,
              scope: "user",
              path: fullPath,
              namespace,
              frontmatter:
                Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
              size: lstat.size,
              lastModified: lstat.mtime.toISOString(),
              type,
              isSymlink: true,
              symlinkTarget,
            })
          } catch {
            // 심볼릭 링크 대상 없음 등 무시
          }
        } else {
          // 폴더 symlink인 경우 재귀 탐색
          try {
            const realPath = await fs.realpath(fullPath)
            const stat = await fs.stat(realPath)
            if (stat.isDirectory()) {
              await walk(fullPath, entry.name)
            }
          } catch {
            // 무효한 symlink 무시
          }
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const [content, stat] = await Promise.all([
            fs.readFile(fullPath, "utf-8"),
            fs.stat(fullPath),
          ])

          const parsed = matter(content)
          const name = entry.name.replace(/\.md$/, "")

          results.push({
            name,
            scope: "user",
            path: fullPath,
            namespace,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type,
            isSymlink: false,
          })
        } catch {
          // 읽기 실패 무시
        }
      }
    }
  }

  await walk(basePath)
  return results
}

// ── AgentFile 목록 + 스코프 자동 설정 ──

export async function scanMdDirWithScope(
  basePath: string,
  type: AgentFile["type"],
  scope: Scope,
): Promise<AgentFile[]> {
  const files = await scanMdDir(basePath, type)
  return files.map((f) => ({ ...f, scope }))
}

// ── Skills 디렉토리 스캔 (SKILL.md 기반 + flat .md) ──

/**
 * Scan .claude/skills/ directory for both directory-based skills (SKILL.md)
 * and flat .md files (legacy format)
 */
export async function scanSkillsDir(basePath: string): Promise<AgentFile[]> {
  const results: AgentFile[] = []
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name)

      // Resolve symlinks to determine if they point to directories
      const isDir = entry.isDirectory()
      const isSymlinkDir =
        entry.isSymbolicLink() &&
        (await fs
          .stat(fullPath)
          .then((s) => s.isDirectory())
          .catch(() => false))

      if (isDir || isSymlinkDir) {
        // Check if directory contains SKILL.md
        const skillMdPath = path.join(fullPath, "SKILL.md")
        try {
          const stat = await fs.stat(skillMdPath)
          const content = await fs.readFile(skillMdPath, "utf-8")
          const parsed = matter(content)

          // Collect supporting files
          const supportingFiles: SupportingFile[] = []
          await collectSupportingFiles(fullPath, fullPath, supportingFiles)

          results.push({
            name: entry.name,
            scope: "user", // will be overridden by caller
            path: skillMdPath,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: true,
            isSymlink: isSymlinkDir,
            supportingFiles,
          })
        } catch {
          // No SKILL.md, skip
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Flat .md file (legacy or simple skill)
        try {
          const stat = await fs.stat(fullPath)
          const content = await fs.readFile(fullPath, "utf-8")
          const parsed = matter(content)
          results.push({
            name: entry.name.replace(/\.md$/, ""),
            scope: "user",
            path: fullPath,
            frontmatter:
              Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: false,
          })
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results
}

async function collectSupportingFiles(
  baseDir: string,
  currentDir: string,
  results: SupportingFile[],
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)
    if (entry.isFile() && entry.name !== "SKILL.md") {
      const stat = await fs.stat(fullPath)
      results.push({ name: entry.name, relativePath, size: stat.size })
    } else if (entry.isDirectory()) {
      await collectSupportingFiles(baseDir, fullPath, results)
    }
  }
}

// ── 모든 AgentFile 반환 (타입별) ──

export async function getAgentFiles(
  type: AgentFile["type"],
  projectPath?: string,
): Promise<AgentFile[]> {
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  if (type === "skill") {
    // Use skills-aware scanner for directory-based skills
    const globalSkills = await scanSkillsDir(path.join(globalBase, "skills"))
    for (const f of globalSkills) f.scope = "user"

    // Also include legacy commands
    const globalCommands = await scanMdDir(
      path.join(globalBase, "commands"),
      "command",
    )
    for (const f of globalCommands) f.scope = "user"

    const projectSkills = await scanSkillsDir(path.join(projectBase, "skills"))
    for (const f of projectSkills) f.scope = "project"

    const projectCommands = await scanMdDir(
      path.join(projectBase, "commands"),
      "command",
    )
    for (const f of projectCommands) f.scope = "project"

    return [
      ...globalSkills,
      ...globalCommands,
      ...projectSkills,
      ...projectCommands,
    ]
  }

  const dirName = `${type}s` // 'agent' → 'agents', 'command' → 'commands'

  const [globalFiles, projectFiles] = await Promise.all([
    scanMdDirWithScope(path.join(globalBase, dirName), type, "user"),
    scanMdDirWithScope(path.join(projectBase, dirName), type, "project"),
  ])

  return [...globalFiles, ...projectFiles]
}

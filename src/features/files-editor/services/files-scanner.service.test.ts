import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  isExcluded,
  readFileContent,
  resolveClaudeDir,
  scanClaudeDir,
} from "./files-scanner.service"

describe("files-scanner.service", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "files-scanner-"))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe("resolveClaudeDir", () => {
    it("returns ~/.claude for global scope", () => {
      const result = resolveClaudeDir("global")
      expect(result).toBe(path.join(os.homedir(), ".claude"))
    })

    it("returns <project>/.claude for project scope", () => {
      const result = resolveClaudeDir("project", "/foo/bar")
      expect(result).toBe("/foo/bar/.claude")
    })
  })

  describe("isExcluded", () => {
    it("excludes cache directories", () => {
      expect(isExcluded("cache")).toBe(true)
    })

    it("excludes .DS_Store", () => {
      expect(isExcluded(".DS_Store")).toBe(true)
    })

    it("excludes .db files", () => {
      expect(isExcluded("data.db")).toBe(true)
    })

    it("excludes large auto-generated directories", () => {
      expect(isExcluded("debug")).toBe(true)
      expect(isExcluded("file-history")).toBe(true)
    })

    it("allows normal files", () => {
      expect(isExcluded("CLAUDE.md")).toBe(false)
      expect(isExcluded("settings.json")).toBe(false)
    })
  })

  describe("scanClaudeDir", () => {
    it("returns empty children for non-existent dir", async () => {
      const result = await scanClaudeDir("project", "/nonexistent/path")
      expect(result.type).toBe("directory")
      expect(result.children).toEqual([])
    })

    it("scans directory tree structure", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "agents"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "# Test")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "{}")
      await fs.writeFile(path.join(claudeDir, "agents", "commit.md"), "---")

      const result = await scanClaudeDir("project", tmpDir)
      expect(result.type).toBe("directory")
      expect(result.children).toBeDefined()

      // 루트 children 에 .claude 서브디렉토리가 있어야 함
      const claudeSubDir = result.children?.find((c) => c.name === ".claude")
      expect(claudeSubDir?.type).toBe("directory")

      const names = claudeSubDir?.children?.map((c) => c.name).sort()
      expect(names).toContain("CLAUDE.md")
      expect(names).toContain("settings.json")
      expect(names).toContain("agents")

      const agentsDir = claudeSubDir?.children?.find((c) => c.name === "agents")
      expect(agentsDir?.type).toBe("directory")
      expect(agentsDir?.children?.length).toBe(1)
      expect(agentsDir?.children?.[0].name).toBe("commit.md")
    })

    it("excludes cache directories", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "plugins", "cache"), {
        recursive: true,
      })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "test")
      await fs.writeFile(
        path.join(claudeDir, "plugins", "cache", "big.js"),
        "x",
      )

      const result = await scanClaudeDir("project", tmpDir)
      const claudeSubDir = result.children?.find((c) => c.name === ".claude")
      expect(claudeSubDir).toBeDefined()
      const pluginsDir = claudeSubDir?.children?.find(
        (c) => c.name === "plugins",
      )
      expect(pluginsDir).toBeDefined()
      const cacheDir = pluginsDir?.children?.find((c) => c.name === "cache")
      expect(cacheDir).toBeUndefined()
    })

    it("sorts directories first, then files alphabetically", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "agents"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "a")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "b")

      const result = await scanClaudeDir("project", tmpDir)
      const claudeSubDir = result.children?.find((c) => c.name === ".claude")
      const types = claudeSubDir?.children?.map((c) => c.type) ?? []
      const dirIdx = types.indexOf("directory")
      const fileIdx = types.indexOf("file")
      expect(dirIdx).toBeLessThan(fileIdx)
    })

    it("includes root-level Claude files before .claude dir (project scope)", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(claudeDir, { recursive: true })
      await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root CLAUDE")
      await fs.writeFile(path.join(tmpDir, "AGENTS.md"), "# Agents")
      await fs.writeFile(path.join(tmpDir, ".agents"), "agents file")
      await fs.writeFile(path.join(tmpDir, ".cursorrules"), "rules")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "{}")

      const result = await scanClaudeDir("project", tmpDir)
      const childNames = result.children?.map((c) => c.name) ?? []

      expect(childNames).toContain("CLAUDE.md")
      expect(childNames).toContain("AGENTS.md")
      expect(childNames).toContain(".agents")
      expect(childNames).toContain(".cursorrules")
      expect(childNames).toContain(".claude")

      // 루트 파일들이 .claude 디렉토리보다 앞에 위치해야 함
      const claudeIdx = childNames.indexOf(".claude")
      const claudeMdIdx = childNames.indexOf("CLAUDE.md")
      expect(claudeMdIdx).toBeLessThan(claudeIdx)
    })

    it("omits root-level Claude files that don't exist", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(claudeDir, { recursive: true })
      await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root")

      const result = await scanClaudeDir("project", tmpDir)
      const childNames = result.children?.map((c) => c.name) ?? []

      expect(childNames).toContain("CLAUDE.md")
      expect(childNames).not.toContain("AGENTS.md")
      expect(childNames).not.toContain(".cursorrules")
      expect(childNames).not.toContain(".agents")
    })

    it("returns empty children when no root files and no .claude dir (project scope)", async () => {
      const result = await scanClaudeDir("project", tmpDir)
      expect(result.type).toBe("directory")
      expect(result.children).toEqual([])
    })

    it("handles .agents as directory when it is a directory", async () => {
      const agentsDir = path.join(tmpDir, ".agents")
      await fs.mkdir(path.join(agentsDir, "skills"), { recursive: true })
      await fs.writeFile(path.join(agentsDir, "skills", "commit.md"), "skill")

      const result = await scanClaudeDir("project", tmpDir)
      const agentsNode = result.children?.find((c) => c.name === ".agents")
      expect(agentsNode?.type).toBe("directory")
      expect(agentsNode?.children).toBeDefined()
    })
  })

  describe("readFileContent", () => {
    it("reads file content and metadata", async () => {
      const filePath = path.join(tmpDir, "test.md")
      await fs.writeFile(filePath, "# Hello World")

      const result = await readFileContent(filePath)
      expect(result.content).toBe("# Hello World")
      expect(result.size).toBeGreaterThan(0)
      expect(result.lastModified).toBeDefined()
    })

    it("throws for non-existent file", async () => {
      await expect(readFileContent("/no/such/file")).rejects.toThrow()
    })
  })
})

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
      expect(result.name).toBe(".claude")
      expect(result.children).toBeDefined()

      const names = result.children?.map((c) => c.name).sort()
      expect(names).toContain("CLAUDE.md")
      expect(names).toContain("settings.json")
      expect(names).toContain("agents")

      const agentsDir = result.children?.find((c) => c.name === "agents")
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
      const pluginsDir = result.children?.find((c) => c.name === "plugins")
      // plugins dir exists but cache inside is excluded
      if (pluginsDir) {
        const cacheDir = pluginsDir.children?.find((c) => c.name === "cache")
        expect(cacheDir).toBeUndefined()
      }
    })

    it("sorts directories first, then files alphabetically", async () => {
      const claudeDir = path.join(tmpDir, ".claude")
      await fs.mkdir(path.join(claudeDir, "agents"), { recursive: true })
      await fs.writeFile(path.join(claudeDir, "CLAUDE.md"), "a")
      await fs.writeFile(path.join(claudeDir, "settings.json"), "b")

      const result = await scanClaudeDir("project", tmpDir)
      const types = result.children?.map((c) => c.type) ?? []
      const dirIdx = types.indexOf("directory")
      const fileIdx = types.indexOf("file")
      expect(dirIdx).toBeLessThan(fileIdx)
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

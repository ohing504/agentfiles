import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { scanClaudeMdFiles } from "@/services/config-service"

// ── tmp 디렉토리 기반 테스트 헬퍼 ──

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-scan-test-"))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

let tmpDir: string

beforeEach(async () => {
  tmpDir = await createTmpDir()
})

afterEach(async () => {
  await removeTmpDir(tmpDir)
})

describe("scanClaudeMdFiles", () => {
  it("루트의 CLAUDE.md를 찾는다", async () => {
    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root Claude MD")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe("CLAUDE.md")
    expect(results[0].absolutePath).toBe(path.join(tmpDir, "CLAUDE.md"))
    expect(results[0].size).toBeGreaterThan(0)
    expect(results[0].lastModified).toBeTruthy()
  })

  it(".claude/ 디렉토리 내 CLAUDE.md를 찾는다", async () => {
    await writeFile(
      path.join(tmpDir, ".claude", "CLAUDE.md"),
      "# Project Claude MD",
    )

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe(path.join(".claude", "CLAUDE.md"))
  })

  it("서브디렉토리의 CLAUDE.md를 재귀적으로 찾는다", async () => {
    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root")
    await writeFile(path.join(tmpDir, "src", "CLAUDE.md"), "# Src")
    await writeFile(
      path.join(tmpDir, "src", "components", "CLAUDE.md"),
      "# Components",
    )
    await writeFile(path.join(tmpDir, ".claude", "CLAUDE.md"), "# DotClaude")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(4)

    const relativePaths = results.map((r) => r.relativePath).sort()
    expect(relativePaths).toEqual(
      [
        "CLAUDE.md",
        path.join(".claude", "CLAUDE.md"),
        path.join("src", "CLAUDE.md"),
        path.join("src", "components", "CLAUDE.md"),
      ].sort(),
    )
  })

  it("node_modules 디렉토리를 건너뛴다", async () => {
    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root")
    await writeFile(
      path.join(tmpDir, "node_modules", "some-pkg", "CLAUDE.md"),
      "# Should skip",
    )

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe("CLAUDE.md")
  })

  it(".git 디렉토리를 건너뛴다", async () => {
    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root")
    await writeFile(path.join(tmpDir, ".git", "CLAUDE.md"), "# Should skip")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe("CLAUDE.md")
  })

  it("여러 제외 디렉토리를 모두 건너뛴다", async () => {
    const excludedDirs = [
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
    ]

    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Root")
    for (const dir of excludedDirs) {
      await writeFile(
        path.join(tmpDir, dir, "CLAUDE.md"),
        `# ${dir} - should skip`,
      )
    }

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe("CLAUDE.md")
  })

  it("올바른 relativePath 값을 반환한다", async () => {
    await writeFile(path.join(tmpDir, "src", "utils", "CLAUDE.md"), "# Utils")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe(path.join("src", "utils", "CLAUDE.md"))
    expect(results[0].absolutePath).toBe(
      path.join(tmpDir, "src", "utils", "CLAUDE.md"),
    )
  })

  it("존재하지 않는 디렉토리를 graceful하게 처리한다", async () => {
    const nonExistentPath = path.join(tmpDir, "does-not-exist")

    const results = await scanClaudeMdFiles(nonExistentPath)

    expect(results).toEqual([])
  })

  it("CLAUDE.md가 없으면 빈 배열을 반환한다", async () => {
    // tmpDir은 존재하지만 CLAUDE.md가 없음
    await writeFile(path.join(tmpDir, "README.md"), "# Readme")
    await writeFile(path.join(tmpDir, "src", "index.ts"), "export {}")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toEqual([])
  })

  it("CLAUDE.md가 아닌 다른 .md 파일은 무시한다", async () => {
    await writeFile(path.join(tmpDir, "CLAUDE.md"), "# Claude")
    await writeFile(path.join(tmpDir, "README.md"), "# Readme")
    await writeFile(path.join(tmpDir, "CONTRIBUTING.md"), "# Contributing")
    await writeFile(path.join(tmpDir, "src", "notes.md"), "# Notes")

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].relativePath).toBe("CLAUDE.md")
  })

  it("size와 lastModified 필드를 올바르게 반환한다", async () => {
    const content = "# Test Content\nSome text here"
    await writeFile(path.join(tmpDir, "CLAUDE.md"), content)

    const results = await scanClaudeMdFiles(tmpDir)

    expect(results).toHaveLength(1)
    expect(results[0].size).toBe(Buffer.byteLength(content, "utf-8"))
    // ISO 날짜 형식인지 확인
    expect(new Date(results[0].lastModified).toISOString()).toBe(
      results[0].lastModified,
    )
  })
})

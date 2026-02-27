import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getAgentFiles, scanMdDir } from "./agent-file-service"

// ── tmp 디렉토리 기반 테스트 헬퍼 ──

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-test-"))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

// ── 모킹: process.cwd() + os.homedir() ──

let tmpGlobal: string
let tmpProject: string

beforeEach(async () => {
  tmpGlobal = await createTmpDir()
  tmpProject = await createTmpDir()

  vi.spyOn(os, "homedir").mockReturnValue(tmpGlobal)
  vi.spyOn(process, "cwd").mockReturnValue(tmpProject)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all([removeTmpDir(tmpGlobal), removeTmpDir(tmpProject)])
})

// ── scanMdDir ──

describe("scanMdDir", () => {
  it("존재하지 않는 디렉토리 → 빈 배열", async () => {
    const result = await scanMdDir("/nonexistent/path", "command")
    expect(result).toEqual([])
  })

  it("빈 디렉토리 → 빈 배열", async () => {
    const emptyDir = path.join(tmpGlobal, "empty")
    await fs.mkdir(emptyDir, { recursive: true })

    const result = await scanMdDir(emptyDir, "command")
    expect(result).toEqual([])
  })

  it("frontmatter 없는 md 파일 정상 처리", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(
      path.join(dir, "simple.md"),
      "# Simple Command\nNo frontmatter here",
    )

    const result = await scanMdDir(dir, "command")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("simple")
    expect(result[0].frontmatter).toBeUndefined()
    expect(result[0].type).toBe("command")
    expect(result[0].isSymlink).toBe(false)
  })

  it("frontmatter 있는 md 파일 파싱", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(
      path.join(dir, "commit.md"),
      "---\nname: commit\ndescription: Git commit helper\n---\n# Commit",
    )

    const result = await scanMdDir(dir, "command")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("commit")
    expect(result[0].frontmatter?.name).toBe("commit")
    expect(result[0].frontmatter?.description).toBe("Git commit helper")
  })

  it("서브폴더명이 네임스페이스로 설정됨", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(path.join(dir, "ys", "commit.md"), "# Commit")
    await writeFile(path.join(dir, "ys", "review-pr.md"), "# Review PR")

    const result = await scanMdDir(dir, "command")

    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name).sort()
    expect(names).toEqual(["commit", "review-pr"])
    for (const r of result) {
      expect(r.namespace).toBe("ys")
    }
  })

  it("루트 파일은 namespace 없음", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(path.join(dir, "root-cmd.md"), "# Root")

    const result = await scanMdDir(dir, "command")

    expect(result[0].namespace).toBeUndefined()
  })

  it("여러 중첩 폴더 처리", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(path.join(dir, "ns1", "cmd1.md"), "# Cmd1")
    await writeFile(path.join(dir, "ns2", "cmd2.md"), "# Cmd2")
    await writeFile(path.join(dir, "root.md"), "# Root")

    const result = await scanMdDir(dir, "command")

    expect(result).toHaveLength(3)
    const ns1 = result.find((r) => r.name === "cmd1")
    const ns2 = result.find((r) => r.name === "cmd2")
    const root = result.find((r) => r.name === "root")
    expect(ns1?.namespace).toBe("ns1")
    expect(ns2?.namespace).toBe("ns2")
    expect(root?.namespace).toBeUndefined()
  })

  it("agent 타입으로 스캔", async () => {
    const dir = path.join(tmpGlobal, "agents")
    await writeFile(
      path.join(dir, "my-agent.md"),
      "---\ndescription: My agent\n---\n",
    )

    const result = await scanMdDir(dir, "agent")

    expect(result[0].type).toBe("agent")
    expect(result[0].name).toBe("my-agent")
  })

  it("symlink md 파일 처리", async () => {
    const dir = path.join(tmpGlobal, "skills")
    const targetFile = path.join(tmpGlobal, "actual-skill.md")
    const symlinkFile = path.join(dir, "find-skills.md")

    await writeFile(targetFile, "# Actual Skill")
    await fs.mkdir(dir, { recursive: true })
    await fs.symlink(targetFile, symlinkFile)

    const result = await scanMdDir(dir, "skill")

    expect(result).toHaveLength(1)
    expect(result[0].isSymlink).toBe(true)
    expect(result[0].symlinkTarget).toBe(targetFile)
    expect(result[0].name).toBe("find-skills")
  })
})

// ── getAgentFiles ──

describe("getAgentFiles", () => {
  it("agent 타입 글로벌+프로젝트 합산", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "agents", "g-agent.md"),
      "# Global Agent",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "agents", "p-agent.md"),
      "# Project Agent",
    )

    const result = await getAgentFiles("agent")

    expect(result).toHaveLength(2)
    const globalAgent = result.find((a) => a.name === "g-agent")
    const projectAgent = result.find((a) => a.name === "p-agent")
    expect(globalAgent?.scope).toBe("global")
    expect(projectAgent?.scope).toBe("project")
  })

  it("command 타입 스캔", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "ns", "my-cmd.md"),
      "# MyCmd",
    )

    const result = await getAgentFiles("command")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("my-cmd")
    expect(result[0].namespace).toBe("ns")
    expect(result[0].type).toBe("command")
  })

  it("skill 타입 스캔", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "skills", "my-skill.md"),
      "# MySkill",
    )

    const result = await getAgentFiles("skill")

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("skill")
  })
})

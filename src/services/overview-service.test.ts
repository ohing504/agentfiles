import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getOverview } from "./overview-service"

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

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2))
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

// ── getOverview ──

describe("getOverview", () => {
  it("빈 환경에서 Overview 반환 (모두 0)", async () => {
    const result = await getOverview()

    expect(result.claudeMd.global).toBeUndefined()
    expect(result.claudeMd.project).toBeUndefined()
    expect(result.plugins.total).toBe(0)
    expect(result.mcpServers.total).toBe(0)
    expect(result.agents.total).toBe(0)
    expect(result.commands.total).toBe(0)
    expect(result.skills.total).toBe(0)
    expect(result.conflictCount).toBe(0)
  })

  it("글로벌 + 프로젝트 CLAUDE.md 포함", async () => {
    await writeFile(path.join(tmpGlobal, ".claude", "CLAUDE.md"), "# Global")
    await writeFile(path.join(tmpProject, ".claude", "CLAUDE.md"), "# Project")

    const result = await getOverview()

    expect(result.claudeMd.global).toBeDefined()
    expect(result.claudeMd.project).toBeDefined()
    expect(result.claudeMd.global?.scope).toBe("global")
    expect(result.claudeMd.project?.scope).toBe("project")
  })

  it("agents 글로벌/프로젝트 카운트", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "agents", "agent1.md"),
      "# Agent1",
    )
    await writeFile(
      path.join(tmpGlobal, ".claude", "agents", "agent2.md"),
      "# Agent2",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "agents", "agent3.md"),
      "# Agent3",
    )

    const result = await getOverview()

    expect(result.agents.global).toBe(2)
    expect(result.agents.project).toBe(1)
    expect(result.agents.total).toBe(3)
  })

  it("commands 글로벌/프로젝트 카운트", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "cmd1.md"),
      "# Cmd1",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "commands", "cmd2.md"),
      "# Cmd2",
    )

    const result = await getOverview()

    expect(result.commands.global).toBe(1)
    expect(result.commands.project).toBe(1)
    expect(result.commands.total).toBe(2)
  })

  it("충돌 감지: 양쪽에 같은 이름의 command 존재", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "commit.md"),
      "# Global Commit",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "commands", "commit.md"),
      "# Project Commit",
    )
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "unique.md"),
      "# Unique",
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(1)
  })

  it("충돌 없는 경우 conflictCount = 0", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "global-only.md"),
      "# Global",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "commands", "project-only.md"),
      "# Project",
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(0)
  })

  it("여러 타입의 충돌 합산", async () => {
    // agents 충돌 1개
    await writeFile(
      path.join(tmpGlobal, ".claude", "agents", "same-agent.md"),
      "# Agent",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "agents", "same-agent.md"),
      "# Agent",
    )
    // commands 충돌 2개
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "cmd-a.md"),
      "# CmdA",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "commands", "cmd-a.md"),
      "# CmdA",
    )
    await writeFile(
      path.join(tmpGlobal, ".claude", "commands", "cmd-b.md"),
      "# CmdB",
    )
    await writeFile(
      path.join(tmpProject, ".claude", "commands", "cmd-b.md"),
      "# CmdB",
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(3)
  })

  it("MCP 서버 카운트 포함", async () => {
    // mcp-service는 ~/.claude.json과 .mcp.json에서 읽음
    await writeJson(path.join(tmpGlobal, ".claude.json"), {
      mcpServers: {
        "g-mcp-1": { command: "node", args: [] },
        "g-mcp-2": { command: "python", args: [] },
      },
    })
    await writeJson(path.join(tmpProject, ".mcp.json"), {
      mcpServers: {
        "p-mcp-1": { command: "deno", args: [] },
      },
    })

    const result = await getOverview()

    expect(result.mcpServers.global).toBe(2)
    expect(result.mcpServers.project).toBe(1)
    expect(result.mcpServers.total).toBe(3)
  })

  it("plugins 카운트 포함", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "plugin-user@mkt": [
          {
            scope: "user",
            installPath: "/p/u",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
        "plugin-proj@mkt": [
          {
            scope: "project",
            projectPath: "/some/proj",
            installPath: "/p/p",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha2",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )

    const result = await getOverview()

    expect(result.plugins.total).toBe(2)
    expect(result.plugins.user).toBe(1)
    expect(result.plugins.project).toBe(1)
  })

  it("getOverview가 projectPath를 getPlugins에 전달 → project enabledPlugins 반영", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "ov-plugin@mkt": [
          {
            scope: "user",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )
    // 프로젝트 settings에서만 enabled 설정
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "ov-plugin@mkt": true },
    })

    // projectPath 전달해서 getOverview 호출
    const result = await getOverview(tmpProject)
    // getPlugins(projectPath) 내부에서 project settings도 읽어야 함
    expect(result.plugins.total).toBe(1)
  })

  it("project 스코프 플러그인이 projectPath로 정상 필터링됨", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "proj-plugin@mkt": [
          {
            scope: "project",
            projectPath: tmpProject,
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
        "other-proj@mkt": [
          {
            scope: "project",
            projectPath: "/other/unrelated/project",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha2",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )

    const result = await getOverview(tmpProject)
    // tmpProject 과 일치하는 project 플러그인만 포함
    expect(result.plugins.total).toBe(1)
    expect(result.plugins.project).toBe(1)
  })
})

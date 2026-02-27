/**
 * 서비스 통합 테스트 - CRUD 흐름
 *
 * writeMarkdown() / deleteFile() 등 FileWriter와
 * getClaudeMd() / getAgentFiles() / getOverview() / scanMdDir() 등 ConfigService를
 * 함께 테스트하여 실제 파일시스템 기반 CRUD 흐름이 올바른지 검증한다.
 */

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getAgentFiles, scanMdDir } from "@/services/agent-file-service"
import { getClaudeMd } from "@/services/config-service"
import { deleteFile, writeMarkdown } from "@/services/file-writer"
import { getOverview } from "@/services/overview-service"

// ── tmp 디렉토리 헬퍼 ──

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-crud-test-"))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
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

// ── 1. CLAUDE.md CRUD ──

describe("CLAUDE.md CRUD 흐름", () => {
  it("글로벌 CLAUDE.md: writeMarkdown → getClaudeMd → content 일치", async () => {
    const claudePath = path.join(tmpGlobal, ".claude", "CLAUDE.md")
    const content = "# 글로벌 설정\n\n이것은 글로벌 CLAUDE.md 입니다."

    // Create
    await writeMarkdown(claudePath, content)

    // Read
    const result = await getClaudeMd("user")

    expect(result).not.toBeNull()
    expect(result?.scope).toBe("user")
    expect(result?.path).toBe(claudePath)
    expect(result?.content).toBe(content)
    expect(result?.size).toBeGreaterThan(0)
    expect(result?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("프로젝트 CLAUDE.md: writeMarkdown → getClaudeMd → content 일치", async () => {
    const claudePath = path.join(tmpProject, ".claude", "CLAUDE.md")
    const content = "# 프로젝트 설정\n\n이것은 프로젝트 CLAUDE.md 입니다."

    // Create
    await writeMarkdown(claudePath, content)

    // Read
    const result = await getClaudeMd("project")

    expect(result).not.toBeNull()
    expect(result?.scope).toBe("project")
    expect(result?.path).toBe(claudePath)
    expect(result?.content).toBe(content)
  })

  it("CLAUDE.md 내용 Update: writeMarkdown 두 번 호출 → 최신 내용 반환", async () => {
    const claudePath = path.join(tmpGlobal, ".claude", "CLAUDE.md")
    const initial = "# 초기 내용"
    const updated = "# 업데이트된 내용\n\n새로운 규칙 추가"

    await writeMarkdown(claudePath, initial)
    const before = await getClaudeMd("user")
    expect(before?.content).toBe(initial)

    await writeMarkdown(claudePath, updated)
    const after = await getClaudeMd("user")
    expect(after?.content).toBe(updated)
  })
})

// ── 2. Agent / Command / Skill CRUD ──

describe("Agent/Command/Skill CRUD 흐름", () => {
  it("Agent CRUD: writeMarkdown → getAgentFiles 목록 포함 → deleteFile → 제외", async () => {
    const agentPath = path.join(tmpGlobal, ".claude", "agents", "my-agent.md")
    const content = "# My Agent\n\n에이전트 설명입니다."

    // Create
    await writeMarkdown(agentPath, content)

    // Read - 목록에 포함 확인
    const listAfterCreate = await getAgentFiles("agent")
    const found = listAfterCreate.find((a) => a.name === "my-agent")
    expect(found).toBeDefined()
    expect(found?.scope).toBe("user")
    expect(found?.type).toBe("agent")

    // Delete
    await deleteFile(agentPath)

    // Read - 목록에서 제외 확인
    const listAfterDelete = await getAgentFiles("agent")
    const notFound = listAfterDelete.find((a) => a.name === "my-agent")
    expect(notFound).toBeUndefined()
  })

  it("Command CRUD: writeMarkdown → getAgentFiles 목록 포함 → deleteFile → 제외", async () => {
    const cmdPath = path.join(tmpGlobal, ".claude", "commands", "my-command.md")
    const content = "# My Command\n\n커맨드 설명입니다."

    await writeMarkdown(cmdPath, content)

    const listAfterCreate = await getAgentFiles("command")
    const found = listAfterCreate.find((c) => c.name === "my-command")
    expect(found).toBeDefined()
    expect(found?.type).toBe("command")

    await deleteFile(cmdPath)

    const listAfterDelete = await getAgentFiles("command")
    const notFound = listAfterDelete.find((c) => c.name === "my-command")
    expect(notFound).toBeUndefined()
  })

  it("Skill CRUD: writeMarkdown → getAgentFiles 목록 포함 → deleteFile → 제외", async () => {
    const skillPath = path.join(tmpProject, ".claude", "skills", "my-skill.md")
    const content = "# My Skill\n\n스킬 설명입니다."

    await writeMarkdown(skillPath, content)

    const listAfterCreate = await getAgentFiles("skill")
    const found = listAfterCreate.find((s) => s.name === "my-skill")
    expect(found).toBeDefined()
    expect(found?.scope).toBe("project")
    expect(found?.type).toBe("skill")

    await deleteFile(skillPath)

    const listAfterDelete = await getAgentFiles("skill")
    const notFound = listAfterDelete.find((s) => s.name === "my-skill")
    expect(notFound).toBeUndefined()
  })

  it("여러 항목 생성 후 일부 삭제 → 나머지 유지", async () => {
    const agentA = path.join(tmpGlobal, ".claude", "agents", "agent-a.md")
    const agentB = path.join(tmpGlobal, ".claude", "agents", "agent-b.md")
    const agentC = path.join(tmpProject, ".claude", "agents", "agent-c.md")

    await Promise.all([
      writeMarkdown(agentA, "# Agent A"),
      writeMarkdown(agentB, "# Agent B"),
      writeMarkdown(agentC, "# Agent C"),
    ])

    const beforeDelete = await getAgentFiles("agent")
    expect(beforeDelete).toHaveLength(3)

    // agentB만 삭제
    await deleteFile(agentB)

    const afterDelete = await getAgentFiles("agent")
    expect(afterDelete).toHaveLength(2)
    expect(afterDelete.find((a) => a.name === "agent-a")).toBeDefined()
    expect(afterDelete.find((a) => a.name === "agent-b")).toBeUndefined()
    expect(afterDelete.find((a) => a.name === "agent-c")).toBeDefined()
  })
})

// ── 3. 글로벌 + 프로젝트 혼합 (충돌 감지) ──

describe("글로벌 + 프로젝트 혼합 및 충돌 감지", () => {
  it("동일 이름 양쪽 생성 → getAgentFiles 양쪽 포함", async () => {
    const name = "shared-agent"
    const globalPath = path.join(tmpGlobal, ".claude", "agents", `${name}.md`)
    const projectPath = path.join(tmpProject, ".claude", "agents", `${name}.md`)

    await Promise.all([
      writeMarkdown(globalPath, "# 글로벌 에이전트"),
      writeMarkdown(projectPath, "# 프로젝트 에이전트"),
    ])

    const list = await getAgentFiles("agent")
    expect(list).toHaveLength(2)

    const globalAgent = list.find((a) => a.scope === "user")
    const projectAgent = list.find((a) => a.scope === "project")

    expect(globalAgent?.name).toBe(name)
    expect(projectAgent?.name).toBe(name)
  })

  it("동일 이름 command 양쪽 생성 → getOverview conflictCount 반영", async () => {
    const globalCmd = path.join(
      tmpGlobal,
      ".claude",
      "commands",
      "conflict-cmd.md",
    )
    const projectCmd = path.join(
      tmpProject,
      ".claude",
      "commands",
      "conflict-cmd.md",
    )
    const uniqueGlobal = path.join(
      tmpGlobal,
      ".claude",
      "commands",
      "unique-cmd.md",
    )

    await Promise.all([
      writeMarkdown(globalCmd, "# 글로벌 커맨드"),
      writeMarkdown(projectCmd, "# 프로젝트 커맨드"),
      writeMarkdown(uniqueGlobal, "# 유니크 커맨드"),
    ])

    const overview = await getOverview()
    expect(overview.conflictCount).toBe(1)
    expect(overview.commands.total).toBe(3)
    expect(overview.commands.global).toBe(2)
    expect(overview.commands.project).toBe(1)
  })

  it("여러 타입 충돌 합산 → getOverview conflictCount 합계 확인", async () => {
    // agent 충돌 1개
    await writeMarkdown(
      path.join(tmpGlobal, ".claude", "agents", "same-agent.md"),
      "# Agent",
    )
    await writeMarkdown(
      path.join(tmpProject, ".claude", "agents", "same-agent.md"),
      "# Agent",
    )

    // command 충돌 2개
    await writeMarkdown(
      path.join(tmpGlobal, ".claude", "commands", "cmd-x.md"),
      "# CmdX",
    )
    await writeMarkdown(
      path.join(tmpProject, ".claude", "commands", "cmd-x.md"),
      "# CmdX",
    )
    await writeMarkdown(
      path.join(tmpGlobal, ".claude", "commands", "cmd-y.md"),
      "# CmdY",
    )
    await writeMarkdown(
      path.join(tmpProject, ".claude", "commands", "cmd-y.md"),
      "# CmdY",
    )

    const overview = await getOverview()
    expect(overview.conflictCount).toBe(3)
  })

  it("충돌 없는 경우 conflictCount = 0", async () => {
    await writeMarkdown(
      path.join(tmpGlobal, ".claude", "agents", "global-only.md"),
      "# 글로벌 전용",
    )
    await writeMarkdown(
      path.join(tmpProject, ".claude", "agents", "project-only.md"),
      "# 프로젝트 전용",
    )

    const overview = await getOverview()
    expect(overview.conflictCount).toBe(0)
    expect(overview.agents.total).toBe(2)
    expect(overview.agents.global).toBe(1)
    expect(overview.agents.project).toBe(1)
  })

  it("충돌 항목 삭제 후 conflictCount 감소", async () => {
    const globalCmd = path.join(
      tmpGlobal,
      ".claude",
      "commands",
      "conflict-cmd.md",
    )
    const projectCmd = path.join(
      tmpProject,
      ".claude",
      "commands",
      "conflict-cmd.md",
    )

    await Promise.all([
      writeMarkdown(globalCmd, "# 글로벌"),
      writeMarkdown(projectCmd, "# 프로젝트"),
    ])

    const before = await getOverview()
    expect(before.conflictCount).toBe(1)

    // 글로벌 충돌 항목 삭제
    await deleteFile(globalCmd)

    const after = await getOverview()
    expect(after.conflictCount).toBe(0)
  })
})

// ── 4. Frontmatter CRUD ──

describe("Frontmatter 파싱 통합 테스트", () => {
  it("frontmatter 있는 md 작성 → scanMdDir → frontmatter 필드 확인", async () => {
    const dir = path.join(tmpGlobal, ".claude", "commands")
    const filePath = path.join(dir, "deploy.md")
    const content = [
      "---",
      "name: deploy",
      "description: 프로덕션 배포 커맨드",
      "version: 1.0.0",
      "---",
      "# Deploy",
      "",
      "프로덕션에 배포합니다.",
    ].join("\n")

    await writeMarkdown(filePath, content)

    const results = await scanMdDir(dir, "command")

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("deploy")
    expect(results[0].frontmatter).toBeDefined()
    expect(results[0].frontmatter?.name).toBe("deploy")
    expect(results[0].frontmatter?.description).toBe("프로덕션 배포 커맨드")
    expect(results[0].frontmatter?.version).toBe("1.0.0")
  })

  it("frontmatter 없는 md 작성 → scanMdDir → frontmatter undefined", async () => {
    const dir = path.join(tmpProject, ".claude", "agents")
    const filePath = path.join(dir, "simple-agent.md")
    const content = "# Simple Agent\n\nfrontmatter 없는 에이전트"

    await writeMarkdown(filePath, content)

    const results = await scanMdDir(dir, "agent")

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("simple-agent")
    expect(results[0].frontmatter).toBeUndefined()
  })

  it("여러 frontmatter 필드 작성 후 getAgentFiles 로 조회", async () => {
    const agentPath = path.join(
      tmpGlobal,
      ".claude",
      "agents",
      "advanced-agent.md",
    )
    const content = [
      "---",
      "description: 고급 에이전트",
      "author: test-user",
      "tags:",
      "  - ai",
      "  - automation",
      "---",
      "# Advanced Agent",
    ].join("\n")

    await writeMarkdown(agentPath, content)

    const list = await getAgentFiles("agent")
    const agent = list.find((a) => a.name === "advanced-agent")

    expect(agent).toBeDefined()
    expect(agent?.frontmatter?.description).toBe("고급 에이전트")
    expect(agent?.frontmatter?.author).toBe("test-user")
    expect(agent?.frontmatter?.tags).toEqual(["ai", "automation"])
  })

  it("frontmatter Update: 내용 변경 후 재조회 → 새 frontmatter 반영", async () => {
    const dir = path.join(tmpGlobal, ".claude", "skills")
    const filePath = path.join(dir, "my-skill.md")

    const initialContent = [
      "---",
      "description: 초기 스킬",
      "version: 1.0",
      "---",
      "# My Skill",
    ].join("\n")

    await writeMarkdown(filePath, initialContent)

    const beforeResults = await scanMdDir(dir, "skill")
    expect(beforeResults[0].frontmatter?.description).toBe("초기 스킬")
    expect(beforeResults[0].frontmatter?.version).toBe(1.0)

    const updatedContent = [
      "---",
      "description: 업데이트된 스킬",
      "version: 2.0",
      "author: 개발자",
      "---",
      "# My Skill Updated",
    ].join("\n")

    await writeMarkdown(filePath, updatedContent)

    const afterResults = await scanMdDir(dir, "skill")
    expect(afterResults).toHaveLength(1)
    expect(afterResults[0].frontmatter?.description).toBe("업데이트된 스킬")
    expect(afterResults[0].frontmatter?.version).toBe(2.0)
    expect(afterResults[0].frontmatter?.author).toBe("개발자")
  })

  it("네임스페이스 디렉토리 내 frontmatter 파일 작성 → namespace 및 frontmatter 모두 확인", async () => {
    const dir = path.join(tmpGlobal, ".claude", "commands")
    const nsDir = path.join(dir, "devops")
    const filePath = path.join(nsDir, "deploy.md")
    const content = [
      "---",
      "description: DevOps 배포 커맨드",
      "---",
      "# Deploy",
    ].join("\n")

    await writeMarkdown(filePath, content)

    const results = await scanMdDir(dir, "command")

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("deploy")
    expect(results[0].namespace).toBe("devops")
    expect(results[0].frontmatter?.description).toBe("DevOps 배포 커맨드")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    cp: vi.fn(),
    rm: vi.fn(),
    mkdir: vi.fn(),
  },
}))

vi.mock("@/services/config-service", () => ({
  getGlobalConfigPath: vi.fn(() => "/home/user/.claude"),
  getProjectConfigPath: vi.fn(() => "/project/.claude"),
}))

import fs from "node:fs/promises"
import { moveOrCopyEntity } from "@/services/scope-management"

const mockedCp = vi.mocked(fs.cp)
const mockedRm = vi.mocked(fs.rm)
const mockedMkdir = vi.mocked(fs.mkdir)

describe("scope-management", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedCp.mockResolvedValue(undefined)
    mockedRm.mockResolvedValue(undefined)
    mockedMkdir.mockResolvedValue(undefined)
  })

  it("copies a skill from user to project", async () => {
    await moveOrCopyEntity({
      type: "skill",
      name: "my-skill",
      from: "user",
      to: "project",
      mode: "copy",
      projectPath: "/project",
    })
    expect(mockedMkdir).toHaveBeenCalledWith(
      expect.stringContaining("skills"),
      { recursive: true },
    )
    expect(mockedCp).toHaveBeenCalledTimes(1)
    expect(mockedCp).toHaveBeenCalledWith(
      expect.stringContaining("/home/user/.claude/skills/my-skill.md"),
      expect.stringContaining("/project/.claude/skills/my-skill.md"),
      { recursive: true },
    )
    expect(mockedRm).not.toHaveBeenCalled()
  })

  it("moves a skill from project to user", async () => {
    await moveOrCopyEntity({
      type: "skill",
      name: "my-skill",
      from: "project",
      to: "user",
      mode: "move",
      projectPath: "/project",
    })
    expect(mockedCp).toHaveBeenCalledTimes(1)
    expect(mockedRm).toHaveBeenCalledTimes(1)
    expect(mockedRm).toHaveBeenCalledWith(
      expect.stringContaining("/project/.claude/skills/my-skill.md"),
      { recursive: true, force: true },
    )
  })

  it("copies an agent from project to user", async () => {
    await moveOrCopyEntity({
      type: "agent",
      name: "my-agent",
      from: "project",
      to: "user",
      mode: "copy",
      projectPath: "/project",
    })
    expect(mockedCp).toHaveBeenCalledWith(
      expect.stringContaining("/project/.claude/agents/my-agent.md"),
      expect.stringContaining("/home/user/.claude/agents/my-agent.md"),
      { recursive: true },
    )
    expect(mockedRm).not.toHaveBeenCalled()
  })

  it("throws if source and target scope are the same", async () => {
    await expect(
      moveOrCopyEntity({
        type: "skill",
        name: "my-skill",
        from: "user",
        to: "user",
        mode: "move",
      }),
    ).rejects.toThrow("Source and target scope are the same")
  })

  it("throws if name contains path traversal", async () => {
    await expect(
      moveOrCopyEntity({
        type: "skill",
        name: "../etc/passwd",
        from: "user",
        to: "project",
        mode: "copy",
        projectPath: "/project",
      }),
    ).rejects.toThrow("Invalid item name")
  })
})

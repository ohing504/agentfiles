import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ProjectsConfig } from "@/shared/types"

// CONFIG_PATH를 테스트용 임시 경로로 교체하기 위해 모듈 모킹
let tmpDir: string
let configPath: string

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os")
  return {
    ...actual,
    default: {
      ...actual,
      homedir: () => tmpDir,
    },
  }
})

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-test-"))
  configPath = path.join(tmpDir, ".claude", "agentfiles.json")
  // 모듈 캐시 초기화하여 새 tmpDir이 반영되도록
  vi.resetModules()
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("readProjectsConfig", () => {
  it("파일이 없으면 빈 설정을 반환한다 (ENOENT)", async () => {
    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()
    expect(config).toEqual({ projects: [], activeProject: null })
  })

  it("기존 설정 파일을 올바르게 읽는다", async () => {
    const expected: ProjectsConfig = {
      projects: [
        {
          path: "/Users/test/my-project",
          name: "my-project",
          addedAt: "2025-01-01T00:00:00.000Z",
          hasClaudeDir: true,
        },
      ],
      activeProject: "/Users/test/my-project",
    }

    await fs.mkdir(path.dirname(configPath), { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(expected, null, 2), "utf-8")

    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()
    expect(config).toEqual(expected)
  })
})

describe("writeProjectsConfig", () => {
  it("설정 파일을 쓰고 디렉토리가 없으면 생성한다", async () => {
    const config: ProjectsConfig = {
      projects: [
        {
          path: "/Users/test/project-a",
          name: "project-a",
          addedAt: "2025-06-01T00:00:00.000Z",
        },
      ],
      activeProject: "/Users/test/project-a",
    }

    const { writeProjectsConfig } = await import("@/services/project-store")
    await writeProjectsConfig(config)

    const raw = await fs.readFile(configPath, "utf-8")
    const written = JSON.parse(raw)
    expect(written).toEqual(config)
  })

  it("기존 파일을 덮어쓴다", async () => {
    const initial: ProjectsConfig = {
      projects: [],
      activeProject: null,
    }
    const updated: ProjectsConfig = {
      projects: [
        {
          path: "/Users/test/new-project",
          name: "new-project",
          addedAt: "2025-07-01T00:00:00.000Z",
        },
      ],
      activeProject: "/Users/test/new-project",
    }

    await fs.mkdir(path.dirname(configPath), { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(initial, null, 2), "utf-8")

    const { writeProjectsConfig } = await import("@/services/project-store")
    await writeProjectsConfig(updated)

    const raw = await fs.readFile(configPath, "utf-8")
    const written = JSON.parse(raw)
    expect(written).toEqual(updated)
  })
})

describe("getConfigPath", () => {
  it("올바른 설정 파일 경로를 반환한다", async () => {
    const { getConfigPath } = await import("@/services/project-store")
    const result = getConfigPath()
    expect(result).toBe(path.join(tmpDir, ".claude", "agentfiles.json"))
  })
})

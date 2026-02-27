import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { validateItemName } from "@/server/validation"
import { scanMdDir } from "@/services/agent-file-service"
import { getClaudeMd } from "@/services/config-service"
import { writeMarkdown } from "@/services/file-writer"
import { getPlugins } from "@/services/plugin-service"

// ── tmp 디렉토리 헬퍼 ──

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

// ── 1. Path Traversal 방어 ──

describe("validateItemName - Path Traversal 방어", () => {
  it("'../etc/passwd' 입력 시 에러를 throw한다", () => {
    expect(() => validateItemName("../etc/passwd")).toThrow()
  })

  it("'..' 입력 시 에러를 throw한다", () => {
    expect(() => validateItemName("..")).toThrow()
  })

  it("'/' 포함 이름 입력 시 에러를 throw한다", () => {
    expect(() => validateItemName("foo/bar")).toThrow()
  })

  it("'\\\\' 포함 이름 입력 시 에러를 throw한다", () => {
    expect(() => validateItemName("foo\\bar")).toThrow()
  })

  it("빈 문자열 입력 시 에러를 throw한다", () => {
    expect(() => validateItemName("")).toThrow()
  })

  it("정상적인 이름은 에러 없이 통과한다", () => {
    expect(() => validateItemName("my-agent")).not.toThrow()
    expect(() => validateItemName("commit")).not.toThrow()
    expect(() => validateItemName("review-pr")).not.toThrow()
  })
})

// ── 2. 존재하지 않는 리소스 ──

describe("존재하지 않는 리소스 처리", () => {
  it("getClaudeMd - 파일 없으면 null 반환", async () => {
    const result = await getClaudeMd("global")
    expect(result).toBeNull()
  })

  it("getClaudeMd - 프로젝트 파일 없으면 null 반환", async () => {
    const result = await getClaudeMd("project")
    expect(result).toBeNull()
  })

  it("scanMdDir - 빈 디렉토리는 빈 배열 반환", async () => {
    const emptyDir = path.join(tmpGlobal, "empty-dir")
    await fs.mkdir(emptyDir, { recursive: true })
    const result = await scanMdDir(emptyDir, "command")
    expect(result).toEqual([])
  })

  it("scanMdDir - 존재하지 않는 디렉토리는 빈 배열 반환", async () => {
    const result = await scanMdDir(path.join(tmpGlobal, "nonexistent"), "agent")
    expect(result).toEqual([])
  })
})

// ── 3. 잘못된 JSON 파일 graceful 처리 ──

describe("잘못된 JSON 파일 graceful 처리", () => {
  it("getPlugins - installed_plugins.json 깨진 JSON → graceful 처리", async () => {
    // ENOENT가 아닌 JSON 파싱 에러는 throw되어야 한다 (config-service 구현 확인)
    await writeFile(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      "{ broken json",
    )
    // JSON.parse 에러가 throw되는지, 또는 빈 배열이 반환되는지 확인
    // config-service.ts의 getPlugins 구현에서 ENOENT가 아닌 에러는 throw
    await expect(getPlugins()).rejects.toThrow()
  })
})

// ── 4. 특수 문자 파일명 ──

describe("특수 문자 파일명 처리", () => {
  it("한글 이름으로 writeMarkdown 후 읽기 확인", async () => {
    const filePath = path.join(tmpGlobal, "한글파일명.md")
    const content = "# 한글 내용\n\n안녕하세요"
    await writeMarkdown(filePath, content)
    const result = await fs.readFile(filePath, "utf-8")
    expect(result).toBe(content)
  })

  it("공백 포함 파일명으로 writeMarkdown 후 읽기 확인", async () => {
    const filePath = path.join(tmpGlobal, "my file with spaces.md")
    const content = "# File with spaces"
    await writeMarkdown(filePath, content)
    const result = await fs.readFile(filePath, "utf-8")
    expect(result).toBe(content)
  })

  it("한글 파일명을 scanMdDir으로 읽을 수 있다", async () => {
    const dir = path.join(tmpGlobal, "commands")
    await writeFile(path.join(dir, "한글명령어.md"), "# 한글 명령어")

    const result = await scanMdDir(dir, "command")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("한글명령어")
  })

  it("공백 포함 파일명을 scanMdDir으로 읽을 수 있다", async () => {
    const dir = path.join(tmpGlobal, "agents")
    await writeFile(path.join(dir, "my agent.md"), "# My Agent")

    const result = await scanMdDir(dir, "agent")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("my agent")
  })

  it("특수문자(대시, 언더스코어) 포함 파일명 처리", async () => {
    const dir = path.join(tmpGlobal, "skills")
    await writeFile(path.join(dir, "my-skill_v2.md"), "# My Skill v2")

    const result = await scanMdDir(dir, "skill")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("my-skill_v2")
  })
})

// ── 5. 동시 쓰기 충돌 없음 ──

describe("동시 쓰기 처리", () => {
  it("같은 파일에 Promise.all로 여러 writeMarkdown 호출 → no crash", async () => {
    const filePath = path.join(tmpGlobal, "concurrent.md")

    const writes = Array.from({ length: 5 }, (_, i) =>
      writeMarkdown(filePath, `# Write ${i}\n\nContent ${i}`),
    )

    await expect(Promise.all(writes)).resolves.not.toThrow()

    // 파일이 존재하며 읽을 수 있어야 한다
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toContain("# Write")
  })

  it("서로 다른 파일에 동시 쓰기 → 모두 정상 저장", async () => {
    const dir = path.join(tmpGlobal, "concurrent-dir")

    const writes = Array.from({ length: 5 }, (_, i) =>
      writeMarkdown(path.join(dir, `file-${i}.md`), `# File ${i}`),
    )

    await expect(Promise.all(writes)).resolves.not.toThrow()

    // 5개 파일 모두 존재해야 한다
    const files = await fs.readdir(dir)
    expect(files).toHaveLength(5)
  })

  it("동시에 같은 디렉토리 생성 포함 쓰기 → no crash", async () => {
    const baseDir = path.join(tmpGlobal, "shared-dir")

    // 디렉토리가 없는 상태에서 동시에 mkdir + writeFile 시도
    const writes = Array.from({ length: 3 }, (_, i) =>
      writeMarkdown(path.join(baseDir, `item-${i}.md`), `# Item ${i}`),
    )

    await expect(Promise.all(writes)).resolves.not.toThrow()
  })
})

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  findClaudeCli,
  generateToken,
  getGlobalConfigPath,
  getProjectConfigPath,
  hasProjectConfig,
} from "@/server/config"

describe("getGlobalConfigPath", () => {
  it("returns ~/.claude path", () => {
    const result = getGlobalConfigPath()
    expect(result).toBe(path.join(os.homedir(), ".claude"))
  })
})

describe("getProjectConfigPath", () => {
  it("returns .claude under given cwd", () => {
    const result = getProjectConfigPath("/some/project")
    expect(result).toBe("/some/project/.claude")
  })

  it("uses process.cwd() when no cwd provided", () => {
    const result = getProjectConfigPath()
    expect(result).toBe(path.join(process.cwd(), ".claude"))
  })
})

describe("generateToken", () => {
  it("returns a UUID string", () => {
    const token = generateToken()
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it("generates unique tokens", () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})

describe("findClaudeCli", () => {
  it("returns a string or null", () => {
    const result = findClaudeCli()
    expect(result === null || typeof result === "string").toBe(true)
  })
})

describe("hasProjectConfig", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentfiles-test-"))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("returns true when .claude directory exists", () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"))
    expect(hasProjectConfig(tmpDir)).toBe(true)
  })

  it("returns false when .claude directory does not exist", () => {
    expect(hasProjectConfig(tmpDir)).toBe(false)
  })

  it("returns false when .claude is a file not a directory", () => {
    fs.writeFileSync(path.join(tmpDir, ".claude"), "")
    expect(hasProjectConfig(tmpDir)).toBe(false)
  })
})

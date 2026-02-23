import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  addHookToSettings,
  getHooksFromSettings,
  readScriptFile,
  removeHookFromSettings,
  saveHooksToSettings,
} from "@/services/hooks-service"
import type { HookMatcherGroup, HooksSettings } from "@/shared/types"

let tmpDir: string
let settingsFile: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-hooks-test-"))
  settingsFile = path.join(tmpDir, "settings.json")
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

// ── getHooksFromSettings ──

describe("getHooksFromSettings", () => {
  it("hooks 섹션이 없는 settings.json → {}", async () => {
    await fs.writeFile(
      settingsFile,
      JSON.stringify({ model: "claude-3-5-sonnet-20241022" }),
      "utf-8",
    )
    const result = await getHooksFromSettings(settingsFile)
    expect(result).toEqual({})
  })

  it("hooks가 있는 settings.json → 파싱 반환", async () => {
    const hooks: HooksSettings = {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "echo pre" }],
        },
      ],
    }
    await fs.writeFile(
      settingsFile,
      JSON.stringify({ model: "claude-opus-4-6", hooks }),
      "utf-8",
    )
    const result = await getHooksFromSettings(settingsFile)
    expect(result).toEqual(hooks)
  })

  it("settings.json이 없으면 → {}", async () => {
    const result = await getHooksFromSettings(
      path.join(tmpDir, "nonexistent.json"),
    )
    expect(result).toEqual({})
  })
})

// ── saveHooksToSettings ──

describe("saveHooksToSettings", () => {
  it("기존 키를 유지하며 hooks 업데이트", async () => {
    await fs.writeFile(
      settingsFile,
      JSON.stringify({ model: "claude-opus-4-6", env: { FOO: "bar" } }),
      "utf-8",
    )
    const hooks: HooksSettings = {
      SessionStart: [{ hooks: [{ type: "command", command: "echo start" }] }],
    }
    await saveHooksToSettings(settingsFile, hooks)
    const raw = await fs.readFile(settingsFile, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    expect(parsed.model).toBe("claude-opus-4-6")
    expect(parsed.env).toEqual({ FOO: "bar" })
    expect(parsed.hooks).toEqual(hooks)
  })

  it("빈 hooks → hooks 키 제거", async () => {
    const existing = {
      model: "claude-opus-4-6",
      hooks: {
        PreToolUse: [{ hooks: [{ type: "command", command: "echo pre" }] }],
      },
    }
    await fs.writeFile(settingsFile, JSON.stringify(existing), "utf-8")
    await saveHooksToSettings(settingsFile, {})
    const raw = await fs.readFile(settingsFile, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    expect(parsed.model).toBe("claude-opus-4-6")
    expect(Object.hasOwn(parsed, "hooks")).toBe(false)
  })

  it("settings.json이 없으면 새로 생성", async () => {
    const newFile = path.join(tmpDir, "sub", "settings.json")
    const hooks: HooksSettings = {
      Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
    }
    await saveHooksToSettings(newFile, hooks)
    const raw = await fs.readFile(newFile, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    expect(parsed.hooks).toEqual(hooks)
  })
})

// ── addHookToSettings ──

describe("addHookToSettings", () => {
  it("기존 이벤트에 matcher group 추가", async () => {
    const initial: HooksSettings = {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "echo first" }],
        },
      ],
    }
    await fs.writeFile(
      settingsFile,
      JSON.stringify({ hooks: initial }),
      "utf-8",
    )
    const newGroup: HookMatcherGroup = {
      matcher: "Read",
      hooks: [{ type: "command", command: "echo second" }],
    }
    await addHookToSettings(settingsFile, "PreToolUse", newGroup)
    const result = await getHooksFromSettings(settingsFile)
    expect(result.PreToolUse).toHaveLength(2)
    expect(result.PreToolUse?.[1]).toEqual(newGroup)
  })

  it("새 이벤트에 matcher group 추가", async () => {
    await fs.writeFile(settingsFile, JSON.stringify({}), "utf-8")
    const group: HookMatcherGroup = {
      hooks: [{ type: "command", command: "echo session" }],
    }
    await addHookToSettings(settingsFile, "SessionStart", group)
    const result = await getHooksFromSettings(settingsFile)
    expect(result.SessionStart).toHaveLength(1)
    expect(result.SessionStart?.[0]).toEqual(group)
  })
})

// ── removeHookFromSettings ──

describe("removeHookFromSettings", () => {
  it("특정 hook 삭제", async () => {
    const hooks: HooksSettings = {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            { type: "command", command: "echo first" },
            { type: "command", command: "echo second" },
          ],
        },
      ],
    }
    await fs.writeFile(settingsFile, JSON.stringify({ hooks }), "utf-8")
    await removeHookFromSettings(settingsFile, "PreToolUse", 0, 0)
    const result = await getHooksFromSettings(settingsFile)
    expect(result.PreToolUse?.[0].hooks).toHaveLength(1)
    expect(result.PreToolUse?.[0].hooks[0].command).toBe("echo second")
  })

  it("마지막 hook 삭제 시 group도 제거", async () => {
    const hooks: HooksSettings = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "echo only" }] },
        { matcher: "Read", hooks: [{ type: "command", command: "echo read" }] },
      ],
    }
    await fs.writeFile(settingsFile, JSON.stringify({ hooks }), "utf-8")
    await removeHookFromSettings(settingsFile, "PreToolUse", 0, 0)
    const result = await getHooksFromSettings(settingsFile)
    expect(result.PreToolUse).toHaveLength(1)
    expect(result.PreToolUse?.[0].matcher).toBe("Read")
  })

  it("마지막 group 삭제 시 event도 제거", async () => {
    const hooks: HooksSettings = {
      SessionStart: [{ hooks: [{ type: "command", command: "echo start" }] }],
      Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
    }
    await fs.writeFile(settingsFile, JSON.stringify({ hooks }), "utf-8")
    await removeHookFromSettings(settingsFile, "SessionStart", 0, 0)
    const result = await getHooksFromSettings(settingsFile)
    expect(Object.hasOwn(result, "SessionStart")).toBe(false)
    expect(result.Stop).toHaveLength(1)
  })
})

// ── readScriptFile ──

describe("readScriptFile", () => {
  it("존재하는 파일 내용 반환", async () => {
    const filePath = path.join(tmpDir, "script.sh")
    await fs.writeFile(filePath, "#!/bin/bash\necho hello", "utf-8")
    const result = await readScriptFile(filePath)
    expect(result).toBe("#!/bin/bash\necho hello")
  })

  it("존재하지 않는 파일 → null 반환", async () => {
    const result = await readScriptFile(path.join(tmpDir, "nonexistent.sh"))
    expect(result).toBeNull()
  })
})

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  deleteSettingKey,
  readSettings,
  resolveSettingsPath,
  writeSettingKey,
} from "./config-settings.service"

describe("config-settings.service", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "config-test-"))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe("resolveSettingsPath", () => {
    it("resolves user scope to ~/.claude/settings.json", () => {
      const result = resolveSettingsPath("user")
      expect(result).toBe(path.join(os.homedir(), ".claude", "settings.json"))
    })

    it("resolves project scope to .claude/settings.json", () => {
      const result = resolveSettingsPath("project", "/my/project")
      expect(result).toBe("/my/project/.claude/settings.json")
    })

    it("resolves local scope to .claude/settings.local.json", () => {
      const result = resolveSettingsPath("local", "/my/project")
      expect(result).toBe("/my/project/.claude/settings.local.json")
    })
  })

  describe("readSettings", () => {
    it("returns empty object when file does not exist", async () => {
      const result = await readSettings(path.join(tmpDir, "nonexistent.json"))
      expect(result).toEqual({})
    })

    it("parses existing settings.json", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(filePath, JSON.stringify({ model: "opus" }))
      const result = await readSettings(filePath)
      expect(result).toEqual({ model: "opus" })
    })
  })

  describe("writeSettingKey", () => {
    it("creates file and writes key when file does not exist", async () => {
      const filePath = path.join(tmpDir, "new", "settings.json")
      await writeSettingKey(filePath, "model", "opus")
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ model: "opus" })
    })

    it("merges key into existing settings without overwriting", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(
        filePath,
        JSON.stringify({ model: "sonnet", language: "ko" }),
      )
      await writeSettingKey(filePath, "model", "opus")
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ model: "opus", language: "ko" })
    })

    it("handles nested keys with dot notation (sandbox.enabled)", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(filePath, JSON.stringify({}))
      await writeSettingKey(filePath, "sandbox.enabled", true)
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ sandbox: { enabled: true } })
    })

    it("deep merges nested objects without clobbering siblings", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(
        filePath,
        JSON.stringify({
          sandbox: { enabled: true, excludedCommands: ["rm"] },
        }),
      )
      await writeSettingKey(filePath, "sandbox.network.allowedDomains", [
        "example.com",
      ])
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({
        sandbox: {
          enabled: true,
          excludedCommands: ["rm"],
          network: { allowedDomains: ["example.com"] },
        },
      })
    })
  })

  describe("deleteSettingKey", () => {
    it("removes a top-level key", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(
        filePath,
        JSON.stringify({ model: "opus", language: "ko" }),
      )
      await deleteSettingKey(filePath, "model")
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ language: "ko" })
    })

    it("removes a nested key via dot notation", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(
        filePath,
        JSON.stringify({
          sandbox: { enabled: true, network: { httpProxyPort: 8080 } },
        }),
      )
      await deleteSettingKey(filePath, "sandbox.network.httpProxyPort")
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ sandbox: { enabled: true, network: {} } })
    })

    it("no-ops when key does not exist", async () => {
      const filePath = path.join(tmpDir, "settings.json")
      await fs.writeFile(filePath, JSON.stringify({ model: "opus" }))
      await deleteSettingKey(filePath, "nonexistent")
      const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
      expect(content).toEqual({ model: "opus" })
    })
  })
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const messagesDir = path.resolve(__dirname, "../../messages")

function loadMessages(locale: string): Record<string, string> {
  const filePath = path.join(messagesDir, `${locale}.json`)
  return JSON.parse(readFileSync(filePath, "utf-8"))
}

describe("i18n messages", () => {
  const en = loadMessages("en")
  const ko = loadMessages("ko")
  const enKeys = Object.keys(en).sort()
  const koKeys = Object.keys(ko).sort()

  it("en.json and ko.json should have the same keys", () => {
    expect(enKeys).toEqual(koKeys)
  })

  it("no empty values in en.json", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.json key "${key}" is empty`).not.toBe("")
    }
  })

  it("no empty values in ko.json", () => {
    for (const [key, value] of Object.entries(ko)) {
      expect(value, `ko.json key "${key}" is empty`).not.toBe("")
    }
  })

  it("parameterized messages should have matching placeholders", () => {
    const paramRegex = /\{(\w+)\}/g

    for (const key of enKeys) {
      const enParams = [...en[key].matchAll(paramRegex)].map((m) => m[1]).sort()
      const koParams = [...ko[key].matchAll(paramRegex)].map((m) => m[1]).sort()
      expect(koParams, `key "${key}" has mismatched params`).toEqual(enParams)
    }
  })

  it("keys should follow naming convention (prefix_name)", () => {
    const validPrefixes = [
      "action",
      "app",
      "claude",
      "detail",
      "editor",
      "files",
      "hooks",
      "mcp",
      "nav",
      "plugin",
      "scope",
      "settings",
      "skills",
    ]
    for (const key of enKeys) {
      const prefix = key.split("_")[0]
      expect(
        validPrefixes.includes(prefix),
        `key "${key}" has invalid prefix "${prefix}". Expected one of: ${validPrefixes.join(", ")}`,
      ).toBe(true)
    }
  })
})

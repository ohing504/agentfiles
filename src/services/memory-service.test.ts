import { describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises")

import type { Stats } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import {
  getMemoryDir,
  getMemoryFiles,
  projectPathToSlug,
} from "@/services/memory-service"

describe("projectPathToSlug", () => {
  it("converts absolute path to slug", () => {
    expect(projectPathToSlug("/Users/ohing/workspace/financial")).toBe(
      "-Users-ohing-workspace-financial",
    )
  })
  it("handles root path", () => {
    expect(projectPathToSlug("/")).toBe("-")
  })
})

describe("getMemoryDir", () => {
  it("returns correct memory directory path", () => {
    const dir = getMemoryDir("/Users/ohing/workspace/financial")
    expect(dir).toBe(
      `${os.homedir()}/.claude/projects/-Users-ohing-workspace-financial/memory`,
    )
  })
})

describe("getMemoryFiles", () => {
  it("returns empty array when directory does not exist", async () => {
    vi.mocked(fs.readdir).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    const result = await getMemoryFiles("/nonexistent/path")
    expect(result).toEqual([])
  })
  it("returns memory files sorted with MEMORY.md first", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "testing.md", isFile: () => true },
      { name: "MEMORY.md", isFile: () => true },
      { name: "not-md.txt", isFile: () => true },
    ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T>
      ? T
      : never)
    vi.mocked(fs.stat).mockResolvedValue({
      size: 100,
      mtime: new Date("2026-03-05T00:00:00Z"),
    } as unknown as Stats)
    vi.mocked(fs.readFile).mockResolvedValue("# Memory content")
    const result = await getMemoryFiles("/Users/ohing/workspace/test")
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("MEMORY.md")
    expect(result[1].name).toBe("testing.md")
  })
})

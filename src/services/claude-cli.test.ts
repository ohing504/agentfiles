import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:child_process")

import { spawn } from "node:child_process"
import {
  checkCliAvailable,
  mcpAdd,
  mcpListStatus,
  mcpRemove,
  pluginToggle,
} from "@/services/claude-cli"

const mockSpawn = vi.mocked(spawn)

function createMockChild(stdout: string, stderr = "", exitCode = 0) {
  const stdoutListeners: ((data: Buffer) => void)[] = []
  const stderrListeners: ((data: Buffer) => void)[] = []
  const closeListeners: ((code: number) => void)[] = []

  const child = {
    stdout: {
      on: (event: string, handler: (data: Buffer) => void) => {
        if (event === "data") stdoutListeners.push(handler)
      },
    },
    stderr: {
      on: (event: string, handler: (data: Buffer) => void) => {
        if (event === "data") stderrListeners.push(handler)
      },
    },
    kill: vi.fn(),
    on: (event: string, handler: unknown) => {
      if (event === "close")
        closeListeners.push(handler as (code: number) => void)
    },
  }

  process.nextTick(() => {
    if (stdout) {
      for (const h of stdoutListeners) h(Buffer.from(stdout))
    }
    if (stderr) {
      for (const h of stderrListeners) h(Buffer.from(stderr))
    }
    for (const h of closeListeners) h(exitCode)
  })

  return child as unknown as ReturnType<typeof spawn>
}

function createErrorChild(message: string) {
  const errorListeners: ((err: Error) => void)[] = []

  const child = {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    kill: vi.fn(),
    on: (event: string, handler: unknown) => {
      if (event === "error")
        errorListeners.push(handler as (err: Error) => void)
    },
  }

  process.nextTick(() => {
    for (const h of errorListeners) h(new Error(message))
  })

  return child as unknown as ReturnType<typeof spawn>
}

function mockSuccess(stdout: string, stderr = "") {
  mockSpawn.mockImplementation(() => createMockChild(stdout, stderr, 0))
}

function mockFailure(message: string) {
  mockSpawn.mockImplementation(() => createErrorChild(message))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("checkCliAvailable", () => {
  it("CLI가 있으면 available: true와 버전을 반환한다", async () => {
    mockSuccess("claude/1.2.3\n")
    const result = await checkCliAvailable()
    expect(result.available).toBe(true)
    expect(result.version).toBe("claude/1.2.3")
  })

  it("CLI가 없으면 available: false와 reason을 반환한다", async () => {
    mockFailure("command not found: claude")
    const result = await checkCliAvailable()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("Claude CLI not found")
  })
})

describe("mcpAdd", () => {
  it("stdio MCP를 올바른 args로 호출한다", async () => {
    mockSuccess("")
    await mcpAdd("my-server", { command: "npx", args: ["my-pkg"] }, "user")
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["mcp", "add", "my-server", "-s", "user", "--", "npx", "my-pkg"],
      expect.any(Object),
    )
  })

  it("project scope는 -s project로 매핑한다", async () => {
    mockSuccess("")
    await mcpAdd(
      "proj-server",
      { command: "node", args: ["server.js"] },
      "project",
    )
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["mcp", "add", "proj-server", "-s", "project", "--", "node", "server.js"],
      expect.any(Object),
    )
  })

  it("env가 있으면 -e KEY=VALUE 플래그를 추가한다", async () => {
    mockSuccess("")
    await mcpAdd(
      "env-server",
      { command: "run", args: [], env: { TOKEN: "abc", PORT: "3000" } },
      "user",
    )
    const callArgs = mockSpawn.mock.calls[0][1] as string[]
    expect(callArgs).toContain("-e")
    expect(callArgs).toContain("TOKEN=abc")
    expect(callArgs).toContain("PORT=3000")
  })
})

describe("mcpRemove", () => {
  it("global scope는 -s user로 매핑한다", async () => {
    mockSuccess("")
    await mcpRemove("my-server", "user")
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["mcp", "remove", "my-server", "-s", "user"],
      expect.any(Object),
    )
  })

  it("project scope는 -s project로 매핑한다", async () => {
    mockSuccess("")
    await mcpRemove("proj-server", "project")
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["mcp", "remove", "proj-server", "-s", "project"],
      expect.any(Object),
    )
  })
})

describe("pluginToggle", () => {
  it("enable=true이면 plugin enable을 호출한다", async () => {
    mockSuccess("")
    await pluginToggle("my-plugin@vendor", true)
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["plugin", "enable", "my-plugin@vendor"],
      expect.any(Object),
    )
  })

  it("enable=false이면 plugin disable을 호출한다", async () => {
    mockSuccess("")
    await pluginToggle("my-plugin@vendor", false)
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["plugin", "disable", "my-plugin@vendor"],
      expect.any(Object),
    )
  })
})

describe("mcpListStatus", () => {
  it("mcp list args로 claude CLI를 호출하고 stdout을 반환한다", async () => {
    const output =
      "Checking MCP server health...\ncontext7: npx -y @upstash/context7-mcp - ✓ Connected"
    mockSuccess(output)
    const result = await mcpListStatus()
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["mcp", "list"],
      expect.any(Object),
    )
    expect(result).toBe(output)
  })
})

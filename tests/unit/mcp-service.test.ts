/**
 * 단위 테스트: getPluginMcpServers()
 *
 * plugin-service의 getPlugins()를 mock하여
 * 플러그인에서 MCP 서버를 읽는 로직을 검증한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { McpServer, Plugin } from "@/shared/types"

// node:fs/promises mock — readJson()이 내부적으로 사용
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}))

// plugin-service mock
vi.mock("@/services/plugin-service", () => ({
  getPlugins: vi.fn(),
}))

// mock 설정 후 import
import fs from "node:fs/promises"
import { getPluginMcpServers } from "@/services/mcp-service"
import { getPlugins } from "@/services/plugin-service"

// fs.readFile 오버로드 중 string 반환 버전을 사용
const mockedReadFile = vi.mocked(
  fs.readFile as (path: string, encoding: "utf-8") => Promise<string>,
)
const mockedGetPlugins = vi.mocked(getPlugins)

// 기본 Plugin 팩토리
function makePlugin(overrides: Partial<Plugin> = {}): Plugin {
  return {
    id: "test-plugin@marketplace",
    name: "test-plugin",
    marketplace: "marketplace",
    scope: "user",
    version: "1.0.0",
    installedAt: "",
    lastUpdated: "",
    gitCommitSha: "",
    installPath: "/home/user/.claude/plugins/test-plugin",
    enabled: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getPluginMcpServers()", () => {
  it("플러그인이 없을 때 빈 배열 반환", async () => {
    mockedGetPlugins.mockResolvedValue([])

    const result = await getPluginMcpServers()

    expect(result).toEqual([])
  })

  it("활성화된 플러그인에서 MCP 서버를 반환하고 fromPlugin 필드를 설정", async () => {
    const plugin = makePlugin({
      name: "superpowers",
      installPath: "/home/user/.claude/plugins/superpowers",
      enabled: true,
      scope: "user",
    })
    mockedGetPlugins.mockResolvedValue([plugin])

    const mcpJsonContent = JSON.stringify({
      mcpServers: {
        "my-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    })
    mockedReadFile.mockResolvedValue(mcpJsonContent)

    const result = await getPluginMcpServers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<Partial<McpServer>>({
      name: "my-server",
      fromPlugin: "superpowers",
      scope: "global",
      type: "stdio",
      command: "node",
      args: ["server.js"],
    })
  })

  it("user scope 플러그인은 scope: global로 변환", async () => {
    const plugin = makePlugin({ scope: "user", enabled: true })
    mockedGetPlugins.mockResolvedValue([plugin])

    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: { "user-server": { command: "npx", args: ["tool"] } },
      }),
    )

    const result = await getPluginMcpServers()

    expect(result[0].scope).toBe("global")
  })

  it("project scope 플러그인은 scope: project로 변환", async () => {
    const plugin = makePlugin({
      scope: "project",
      enabled: true,
      projectPath: "/workspace/my-project",
    })
    mockedGetPlugins.mockResolvedValue([plugin])

    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: { "project-server": { command: "npx", args: ["tool"] } },
      }),
    )

    const result = await getPluginMcpServers()

    expect(result[0].scope).toBe("project")
  })

  it("비활성화된 플러그인은 스킵", async () => {
    const disabledPlugin = makePlugin({ enabled: false })
    mockedGetPlugins.mockResolvedValue([disabledPlugin])

    const result = await getPluginMcpServers()

    expect(result).toEqual([])
    expect(mockedReadFile).not.toHaveBeenCalled()
  })

  it("installPath가 빈 플러그인은 스킵", async () => {
    const noPathPlugin = makePlugin({ enabled: true, installPath: "" })
    mockedGetPlugins.mockResolvedValue([noPathPlugin])

    const result = await getPluginMcpServers()

    expect(result).toEqual([])
    expect(mockedReadFile).not.toHaveBeenCalled()
  })

  it(".mcp.json이 없는 플러그인은 빈 서버 목록 (에러 무시)", async () => {
    const plugin = makePlugin({ enabled: true })
    mockedGetPlugins.mockResolvedValue([plugin])

    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )

    const result = await getPluginMcpServers()

    expect(result).toEqual([])
  })

  it(".mcp.json이 mcpServers 래퍼 없이 flat 형식인 경우에도 서버 반환", async () => {
    // 실제 context7 플러그인처럼 { "serverName": { command, args } } 형식
    const plugin = makePlugin({
      name: "context7",
      installPath: "/home/user/.claude/plugins/context7",
      enabled: true,
    })
    mockedGetPlugins.mockResolvedValue([plugin])

    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        context7: {
          command: "npx",
          args: ["-y", "@upstash/context7-mcp"],
        },
      }),
    )

    const result = await getPluginMcpServers()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: "context7",
      fromPlugin: "context7",
      command: "npx",
      type: "stdio",
    })
  })

  it("여러 플러그인에서 서버를 모두 수집", async () => {
    const plugin1 = makePlugin({
      name: "plugin-a",
      installPath: "/plugins/a",
      enabled: true,
    })
    const plugin2 = makePlugin({
      name: "plugin-b",
      installPath: "/plugins/b",
      enabled: true,
    })
    mockedGetPlugins.mockResolvedValue([plugin1, plugin2])

    mockedReadFile.mockImplementation((filePath: unknown) => {
      const p = filePath as string
      if (p.includes("/plugins/a")) {
        return Promise.resolve(
          JSON.stringify({
            mcpServers: { "server-a": { command: "node", args: ["a.js"] } },
          }),
        )
      }
      return Promise.resolve(
        JSON.stringify({
          mcpServers: { "server-b": { command: "node", args: ["b.js"] } },
        }),
      )
    })

    const result = await getPluginMcpServers()

    expect(result).toHaveLength(2)
    const names = result.map((s) => s.name)
    expect(names).toContain("server-a")
    expect(names).toContain("server-b")
    expect(result.find((s) => s.name === "server-a")?.fromPlugin).toBe(
      "plugin-a",
    )
    expect(result.find((s) => s.name === "server-b")?.fromPlugin).toBe(
      "plugin-b",
    )
  })
})

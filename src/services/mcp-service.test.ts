import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getMcpServers } from "./mcp-service"

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "mcp-service-test-"))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

let tmpHome: string
let tmpProject: string

beforeEach(async () => {
  tmpHome = await createTmpDir()
  tmpProject = await createTmpDir()
  vi.spyOn(os, "homedir").mockReturnValue(tmpHome)
  vi.spyOn(process, "cwd").mockReturnValue(tmpProject)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all([removeTmpDir(tmpHome), removeTmpDir(tmpProject)])
})

describe("getMcpServers", () => {
  it("파일 없으면 빈 배열", async () => {
    const result = await getMcpServers()
    expect(result).toEqual([])
  })

  it("~/.claude.json user scope stdio 서버 파싱", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        context7: {
          command: "npx",
          args: ["-y", "@upstash/context7-mcp@latest"],
        },
      },
    })

    const result = await getMcpServers()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("context7")
    expect(result[0].scope).toBe("global")
    expect(result[0].type).toBe("stdio")
    expect(result[0].command).toBe("npx")
    expect(result[0].args).toEqual(["-y", "@upstash/context7-mcp@latest"])
  })

  it("SSE 서버 파싱 (url 기반)", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "sse-server": { url: "https://example.com/mcp/sse" },
      },
    })

    const result = await getMcpServers()
    expect(result[0].type).toBe("sse")
    expect(result[0].url).toBe("https://example.com/mcp/sse")
  })

  it("HTTP 서버 파싱 (type: http)", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "http-server": {
          type: "http",
          url: "https://example.com/mcp",
        },
      },
    })

    const result = await getMcpServers()
    expect(result[0].type).toBe("streamable-http")
  })

  it("local scope — projects.{path}.mcpServers 파싱", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      projects: {
        [tmpProject]: {
          mcpServers: {
            "local-server": { command: "node", args: ["local.js"] },
          },
        },
      },
    })

    const result = await getMcpServers(tmpProject)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("local-server")
    expect(result[0].scope).toBe("global")
  })

  it("project scope — .mcp.json 파싱", async () => {
    await writeJson(path.join(tmpProject, ".mcp.json"), {
      mcpServers: {
        "project-mcp": { command: "node", args: ["project.js"] },
      },
    })

    const result = await getMcpServers(tmpProject)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("project-mcp")
    expect(result[0].scope).toBe("project")
  })

  it("user + local + project 서버 합산", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "user-mcp": { command: "node", args: ["user.js"] },
      },
      projects: {
        [tmpProject]: {
          mcpServers: {
            "local-mcp": { command: "node", args: ["local.js"] },
          },
        },
      },
    })
    await writeJson(path.join(tmpProject, ".mcp.json"), {
      mcpServers: {
        "project-mcp": { command: "node", args: ["project.js"] },
      },
    })

    const result = await getMcpServers(tmpProject)

    expect(result).toHaveLength(3)
    expect(result.find((s) => s.name === "user-mcp")?.scope).toBe("global")
    expect(result.find((s) => s.name === "local-mcp")?.scope).toBe("global")
    expect(result.find((s) => s.name === "project-mcp")?.scope).toBe("project")
  })

  it("env 필드 포함 파싱", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "env-mcp": {
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "secret", DEBUG: "1" },
        },
      },
    })

    const result = await getMcpServers()
    expect(result[0].env).toEqual({ API_KEY: "secret", DEBUG: "1" })
  })

  it("disabled 필드 파싱", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "disabled-mcp": { command: "node", disabled: true },
      },
    })

    const result = await getMcpServers()
    expect(result[0].disabled).toBe(true)
  })
})

describe("깨진 JSON graceful 처리", () => {
  it("~/.claude.json 깨진 JSON → 빈 배열", async () => {
    await writeFile(path.join(tmpHome, ".claude.json"), "{ not valid json !!!")
    const result = await getMcpServers()
    expect(result).toEqual([])
  })

  it(".mcp.json 깨진 JSON → user 서버만 반환", async () => {
    await writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: {
        "valid-mcp": { command: "node", args: ["server.js"] },
      },
    })
    await writeFile(path.join(tmpProject, ".mcp.json"), "{ invalid json }")

    const result = await getMcpServers(tmpProject)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("valid-mcp")
    expect(result[0].scope).toBe("global")
  })
})

describe("parseMcpList", () => {
  it("connected 상태를 파싱한다", () => {
    const stdout = `Checking MCP server health...\ncontext7: npx -y @upstash/context7-mcp - ✓ Connected`
    expect(parseMcpList(stdout)).toEqual({ context7: "connected" })
  })

  it("needs_authentication 상태를 파싱한다", () => {
    const stdout = `Checking MCP server health...\nsupabase: https://mcp.supabase.com/rest (HTTP) - ! Needs authentication`
    expect(parseMcpList(stdout)).toEqual({ supabase: "needs_authentication" })
  })

  it("failed 상태를 파싱한다", () => {
    const stdout = `Checking MCP server health...\ngithub: docker run ghcr.io/github/github-mcp-server - ✗ Failed to connect`
    expect(parseMcpList(stdout)).toEqual({ github: "failed" })
  })

  it("여러 서버 상태를 한번에 파싱한다", () => {
    const stdout = [
      "Checking MCP server health...",
      "context7: npx -y @upstash/context7-mcp - ✓ Connected",
      "supabase: https://mcp.supabase.com/rest (HTTP) - ! Needs authentication",
      "github: docker run ghcr.io/github/github-mcp-server - ✗ Failed to connect",
    ].join("\n")
    expect(parseMcpList(stdout)).toEqual({
      context7: "connected",
      supabase: "needs_authentication",
      github: "failed",
    })
  })

  it("plugin prefix 포함 이름을 파싱한다", () => {
    const stdout = `Checking MCP server health...\nplugin:context7:context7: npx -y @upstash/context7-mcp - ✓ Connected`
    expect(parseMcpList(stdout)).toEqual({
      "plugin:context7:context7": "connected",
    })
  })

  it("빈 출력은 빈 객체 반환", () => {
    expect(parseMcpList("")).toEqual({})
    expect(parseMcpList("Checking MCP server health...")).toEqual({})
  })
})

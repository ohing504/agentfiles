import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  readPluginManifest,
  scanPluginComponents,
} from "@/services/config-service"

// ── tmp 디렉토리 기반 테스트 헬퍼 ──

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agentfiles-plugin-test-"))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2))
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

// ── readPluginManifest ──

describe("readPluginManifest", () => {
  it("plugin.json 파일을 읽어서 파싱된 필드를 반환", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "my-plugin")
    const manifest = {
      name: "my-plugin",
      description: "A test plugin",
      author: {
        name: "Test Author",
        email: "test@example.com",
        url: "https://example.com",
      },
      homepage: "https://example.com/my-plugin",
      repository: "https://github.com/test/my-plugin",
      license: "MIT",
      keywords: ["test", "plugin"],
      version: "1.2.3",
    }
    await writeJson(
      path.join(installPath, ".claude-plugin", "plugin.json"),
      manifest,
    )

    const result = await readPluginManifest(installPath)

    expect(result).not.toBeNull()
    expect(result?.name).toBe("my-plugin")
    expect(result?.description).toBe("A test plugin")
    expect(result?.author).toEqual({
      name: "Test Author",
      email: "test@example.com",
      url: "https://example.com",
    })
    expect(result?.homepage).toBe("https://example.com/my-plugin")
    expect(result?.repository).toBe("https://github.com/test/my-plugin")
    expect(result?.license).toBe("MIT")
    expect(result?.keywords).toEqual(["test", "plugin"])
    expect(result?.version).toBe("1.2.3")
  })

  it("manifest 파일이 없으면 null 반환", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "nonexistent-plugin")

    const result = await readPluginManifest(installPath)

    expect(result).toBeNull()
  })
})

// ── scanPluginComponents ──

describe("scanPluginComponents", () => {
  it("commands/*.md 파일을 탐색 (gray-matter frontmatter 포함)", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    await writeFile(
      path.join(installPath, "commands", "deploy.md"),
      "---\nname: deploy\ndescription: Deploy to production\n---\n# Deploy Command",
    )
    await writeFile(
      path.join(installPath, "commands", "rollback.md"),
      "# Rollback Command\nNo frontmatter",
    )

    const result = await scanPluginComponents(installPath)

    expect(result.commands).toHaveLength(2)
    const deploy = result.commands.find((c) => c.name === "deploy")
    const rollback = result.commands.find((c) => c.name === "rollback")
    expect(deploy).toBeDefined()
    expect(deploy?.frontmatter?.name).toBe("deploy")
    expect(deploy?.frontmatter?.description).toBe("Deploy to production")
    expect(rollback).toBeDefined()
    expect(rollback?.frontmatter).toBeUndefined()
  })

  it("skills/*/SKILL.md 패턴으로 스킬 탐색", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    await writeFile(
      path.join(installPath, "skills", "my-skill", "SKILL.md"),
      "---\ndescription: My skill\n---\n# My Skill",
    )
    await writeFile(
      path.join(installPath, "skills", "my-skill", "helper.py"),
      "# helper script",
    )

    const result = await scanPluginComponents(installPath)

    expect(result.skills).toHaveLength(1)
    expect(result.skills[0].name).toBe("my-skill")
    expect(result.skills[0].isSkillDir).toBe(true)
  })

  it("agents/*.md 파일을 탐색", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    await writeFile(
      path.join(installPath, "agents", "reviewer.md"),
      "---\ndescription: Code reviewer agent\n---\n# Reviewer",
    )

    const result = await scanPluginComponents(installPath)

    expect(result.agents).toHaveLength(1)
    expect(result.agents[0].name).toBe("reviewer")
    expect(result.agents[0].type).toBe("agent")
  })

  it("hooks/hooks.json에서 훅 설정 읽기", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    const hooksData = {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "echo pre-tool" }],
        },
      ],
      PostToolUse: [
        {
          hooks: [{ type: "command", command: "echo post-tool" }],
        },
      ],
    }
    await writeJson(path.join(installPath, "hooks", "hooks.json"), hooksData)

    const result = await scanPluginComponents(installPath)

    expect(result.hooks.PreToolUse).toHaveLength(1)
    expect(result.hooks.PreToolUse?.[0].matcher).toBe("Bash")
    expect(result.hooks.PreToolUse?.[0].hooks[0].command).toBe("echo pre-tool")
    expect(result.hooks.PostToolUse).toHaveLength(1)
  })

  it("hooks/hooks.json이 { hooks: {...} } 래퍼 형태여도 정상 파싱", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "wrapped-hooks")
    // 실제 superpowers 플러그인과 같은 형태
    const hooksData = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup|resume",
            hooks: [{ type: "command", command: "run-hook.cmd session-start" }],
          },
        ],
      },
    }
    await writeJson(path.join(installPath, "hooks", "hooks.json"), hooksData)

    const result = await scanPluginComponents(installPath)

    expect(result.hooks.SessionStart).toHaveLength(1)
    expect(result.hooks.SessionStart?.[0].matcher).toBe("startup|resume")
    expect(result.hooks.SessionStart?.[0].hooks[0].command).toBe(
      "run-hook.cmd session-start",
    )
  })

  it(".mcp.json에서 MCP 서버 설정 읽기", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    const mcpData = {
      mcpServers: {
        "plugin-mcp": {
          command: "node",
          args: ["mcp-server.js"],
        },
        "plugin-sse": {
          url: "https://example.com/sse",
        },
      },
    }
    await writeJson(path.join(installPath, ".mcp.json"), mcpData)

    const result = await scanPluginComponents(installPath)

    expect(result.mcpServers).toHaveLength(2)
    const stdio = result.mcpServers.find((s) => s.name === "plugin-mcp")
    const sse = result.mcpServers.find((s) => s.name === "plugin-sse")
    expect(stdio).toBeDefined()
    expect(stdio?.command).toBe("node")
    expect(stdio?.type).toBe("stdio")
    expect(sse).toBeDefined()
    expect(sse?.type).toBe("sse")
  })

  it(".lsp.json에서 LSP 서버 설정 읽기", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "test-plugin")
    const lspData = {
      "typescript-language-server": {
        command: "typescript-language-server",
        args: ["--stdio"],
        transport: "stdio",
        extensionToLanguage: { ".ts": "typescript", ".tsx": "typescriptreact" },
      },
      "rust-analyzer": {
        command: "rust-analyzer",
        extensionToLanguage: { ".rs": "rust" },
      },
    }
    await writeJson(path.join(installPath, ".lsp.json"), lspData)

    const result = await scanPluginComponents(installPath)

    expect(result.lspServers).toHaveLength(2)
    const tsServer = result.lspServers.find(
      (s) => s.name === "typescript-language-server",
    )
    const rustAnalyzer = result.lspServers.find(
      (s) => s.name === "rust-analyzer",
    )
    expect(tsServer).toBeDefined()
    expect(tsServer?.command).toBe("typescript-language-server")
    expect(tsServer?.args).toEqual(["--stdio"])
    expect(tsServer?.transport).toBe("stdio")
    expect(tsServer?.extensionToLanguage).toEqual({
      ".ts": "typescript",
      ".tsx": "typescriptreact",
    })
    expect(rustAnalyzer).toBeDefined()
    expect(rustAnalyzer?.extensionToLanguage).toEqual({ ".rs": "rust" })
  })

  it("installPath가 존재하지 않으면 빈 PluginComponents 반환", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "nonexistent")

    const result = await scanPluginComponents(installPath)

    expect(result.commands).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.agents).toEqual([])
    expect(result.hooks).toEqual({})
    expect(result.mcpServers).toEqual([])
    expect(result.lspServers).toEqual([])
    expect(result.outputStyles).toEqual([])
  })

  it("하위 디렉토리/파일이 없으면 빈 배열/객체 반환", async () => {
    const installPath = path.join(tmpGlobal, "plugins", "empty-plugin")
    await fs.mkdir(installPath, { recursive: true })

    const result = await scanPluginComponents(installPath)

    expect(result.commands).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.agents).toEqual([])
    expect(result.hooks).toEqual({})
    expect(result.mcpServers).toEqual([])
    expect(result.lspServers).toEqual([])
    expect(result.outputStyles).toEqual([])
  })
})

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getMarketplaces,
  getPlugins,
  readPluginManifest,
  scanPluginComponents,
} from "@/services/plugin-service"

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

// ── getPlugins ──

describe("getPlugins", () => {
  it("installed_plugins.json 없으면 빈 배열", async () => {
    const result = await getPlugins()
    expect(result).toEqual([])
  })

  it("버전2 포맷 플러그인 파싱", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "my-plugin@marketplace": [
          {
            scope: "user",
            installPath: "/some/path",
            version: "abc123",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-02T00:00:00.000Z",
            gitCommitSha: "abc123def456",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )

    const result = await getPlugins()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("my-plugin@marketplace")
    expect(result[0].name).toBe("my-plugin")
    expect(result[0].marketplace).toBe("marketplace")
    expect(result[0].scope).toBe("user")
    expect(result[0].enabled).toBe(false) // settings.json 없음
  })

  it("settings.json enabledPlugins(객체) 기반 enabled 필드 설정", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "plugin-a@mkt": [
          {
            scope: "user",
            installPath: "/p/a",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
        "plugin-b@mkt": [
          {
            scope: "user",
            installPath: "/p/b",
            version: "v2",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha2",
          },
        ],
      },
    }
    const settingsJson = {
      enabledPlugins: {
        "plugin-a@mkt": true,
        "plugin-b@mkt": false,
      },
    }

    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )
    await writeJson(
      path.join(tmpGlobal, ".claude", "settings.json"),
      settingsJson,
    )

    const result = await getPlugins()

    const pluginA = result.find((p) => p.id === "plugin-a@mkt")
    const pluginB = result.find((p) => p.id === "plugin-b@mkt")
    expect(pluginA?.enabled).toBe(true)
    expect(pluginB?.enabled).toBe(false)
  })

  it("settings.json enabledPlugins(배열) 기반 enabled 필드 설정", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "plugin-x@mkt": [
          {
            scope: "user",
            installPath: "/p/x",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
      },
    }
    const settingsJson = {
      enabledPlugins: ["plugin-x@mkt"],
    }

    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )
    await writeJson(
      path.join(tmpGlobal, ".claude", "settings.json"),
      settingsJson,
    )

    const result = await getPlugins()

    expect(result[0].enabled).toBe(true)
  })

  it("project 스코프 플러그인 처리", async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        "proj-plugin@mkt": [
          {
            scope: "project",
            projectPath: "/some/project",
            installPath: "/p/proj",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
      },
    }

    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      pluginsJson,
    )

    const result = await getPlugins()

    expect(result[0].scope).toBe("project")
    expect(result[0].projectPath).toBe("/some/project")
  })
})

// ── getPlugins: enabledPlugins 스코프 조합 ──

describe("getPlugins — enabledPlugins scope combinations", () => {
  function makeInstalledPlugins(projectPath: string) {
    return {
      version: 2,
      plugins: {
        "plugin-a@mkt": [
          {
            scope: "user",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha-a",
          },
        ],
        "plugin-b@mkt": [
          {
            scope: "project",
            projectPath,
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha-b",
          },
        ],
        "plugin-c@mkt": [
          {
            scope: "user",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha-c",
          },
        ],
      },
    }
  }

  async function setupInstalledPlugins() {
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      makeInstalledPlugins(tmpProject),
    )
  }

  it("프로젝트 settings.json에만 enabledPlugins → enabled 반영", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true, "plugin-b@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const b = result.find((p) => p.id === "plugin-b@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(true)
    expect(b?.enabled).toBe(true)
    expect(c?.enabled).toBe(false)
  })

  it("글로벌 enabled + 프로젝트 disabled → disabled (프로젝트 우선)", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true },
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": false },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    expect(a?.enabled).toBe(false)
  })

  it("글로벌 disabled + 프로젝트 enabled → enabled (프로젝트 우선)", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": false },
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    expect(a?.enabled).toBe(true)
  })

  it("글로벌에만 enabledPlugins → 글로벌 설정 반영", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true, "plugin-c@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(true)
    expect(c?.enabled).toBe(true)
  })

  it("양쪽 다 enabledPlugins 없으면 모두 disabled", async () => {
    await setupInstalledPlugins()

    const result = await getPlugins(tmpProject)

    for (const plugin of result) {
      expect(plugin.enabled).toBe(false)
    }
  })

  it("글로벌 배열 + 프로젝트 객체 형태 → 올바르게 병합", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: ["plugin-a@mkt"],
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-b@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const b = result.find((p) => p.id === "plugin-b@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(true)
    expect(b?.enabled).toBe(true)
    expect(c?.enabled).toBe(false)
  })

  it("프로젝트 배열 형태 enabledPlugins", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: ["plugin-b@mkt", "plugin-c@mkt"],
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const b = result.find((p) => p.id === "plugin-b@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(false)
    expect(b?.enabled).toBe(true)
    expect(c?.enabled).toBe(true)
  })

  it("글로벌 배열 포함 + 프로젝트 객체 false → disabled", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: ["plugin-a@mkt"],
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": false },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    expect(a?.enabled).toBe(false)
  })

  it("projectPath 없이 호출 → 글로벌 settings만 사용", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": false },
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true },
    })

    const result = await getPlugins()

    const a = result.find((p) => p.id === "plugin-a@mkt")
    expect(a?.enabled).toBe(false)
  })

  it("settings.local.json의 enabledPlugins는 반영되지 않음", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpProject, ".claude", "settings.local.json"), {
      enabledPlugins: { "plugin-a@mkt": true, "plugin-c@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(false)
    expect(c?.enabled).toBe(false)
  })

  it("여러 플러그인 혼합: 글로벌 A만 enabled, 프로젝트 B만 enabled", async () => {
    await setupInstalledPlugins()
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-a@mkt": true },
    })
    await writeJson(path.join(tmpProject, ".claude", "settings.json"), {
      enabledPlugins: { "plugin-b@mkt": true },
    })

    const result = await getPlugins(tmpProject)

    const a = result.find((p) => p.id === "plugin-a@mkt")
    const b = result.find((p) => p.id === "plugin-b@mkt")
    const c = result.find((p) => p.id === "plugin-c@mkt")
    expect(a?.enabled).toBe(true)
    expect(b?.enabled).toBe(true)
    expect(c?.enabled).toBe(false)
  })

  it("scoped 패키지 (@scope/plugin@mkt) enabledPlugins 매칭", async () => {
    const scopedPlugins = {
      version: 2,
      plugins: {
        "@anthropic/superpowers@official": [
          {
            scope: "user",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      scopedPlugins,
    )
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "@anthropic/superpowers@official": true },
    })

    const result = await getPlugins()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("@anthropic/superpowers")
    expect(result[0].marketplace).toBe("official")
    expect(result[0].enabled).toBe(true)
  })
})

// ── getPlugins: edge cases ──

describe("getPlugins — edge cases", () => {
  const basePlugins = {
    version: 2,
    plugins: {
      "edge-plugin@mkt": [
        {
          scope: "user",
          installPath: "",
          version: "v1",
          installedAt: "2026-01-01T00:00:00.000Z",
          lastUpdated: "2026-01-01T00:00:00.000Z",
          gitCommitSha: "sha1",
        },
      ],
    },
  }

  it("enabledPlugins가 null이면 모두 disabled", async () => {
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      basePlugins,
    )
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: null,
    })

    const result = await getPlugins()
    expect(result[0].enabled).toBe(false)
  })

  it("enabledPlugins가 숫자면 모두 disabled", async () => {
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      basePlugins,
    )
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: 42,
    })

    const result = await getPlugins()
    expect(result[0].enabled).toBe(false)
  })

  it("enabledPlugins 객체에 비 boolean 값은 무시", async () => {
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      basePlugins,
    )
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: { "edge-plugin@mkt": "yes" },
    })

    const result = await getPlugins()
    expect(result[0].enabled).toBe(false)
  })

  it("enabledPlugins 배열에 비 문자열 요소는 무시", async () => {
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      basePlugins,
    )
    await writeJson(path.join(tmpGlobal, ".claude", "settings.json"), {
      enabledPlugins: [null, 42, "edge-plugin@mkt"],
    })

    const result = await getPlugins()
    expect(result[0].enabled).toBe(true)
  })

  it("installed_plugins.json이 corrupt JSON이면 에러 전파", async () => {
    await writeFile(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      "{ corrupt json !!!",
    )

    await expect(getPlugins()).rejects.toThrow()
  })

  it("enrichedPlugins: 존재하지 않는 installPath여도 전체 목록 반환", async () => {
    const plugins = {
      version: 2,
      plugins: {
        "good@mkt": [
          {
            scope: "user",
            installPath: "",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha1",
          },
        ],
        "bad@mkt": [
          {
            scope: "user",
            installPath: "/nonexistent/path/that/does/not/exist",
            version: "v1",
            installedAt: "2026-01-01T00:00:00.000Z",
            lastUpdated: "2026-01-01T00:00:00.000Z",
            gitCommitSha: "sha2",
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, ".claude", "plugins", "installed_plugins.json"),
      plugins,
    )

    const result = await getPlugins()
    expect(result).toHaveLength(2)
    expect(result.find((p) => p.id === "good@mkt")).toBeDefined()
    expect(result.find((p) => p.id === "bad@mkt")).toBeDefined()
  })
})

// ── getMarketplaces ──

describe("getMarketplaces", () => {
  it("캐시 디렉토리가 없으면 빈 배열", async () => {
    const result = await getMarketplaces()
    expect(result).toEqual([])
  })

  it("유효한 marketplace.json 파일을 파싱", async () => {
    const cachePath = path.join(tmpGlobal, ".claude", "plugins", "cache")
    const marketplace = {
      name: "official",
      owner: { name: "Anthropic", email: "team@anthropic.com" },
      metadata: { description: "Official marketplace", version: "1.0.0" },
      plugins: [{ id: "plugin-a" }],
      autoUpdate: true,
    }
    await writeJson(
      path.join(cachePath, "official", "marketplace.json"),
      marketplace,
    )

    const result = await getMarketplaces()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("official")
    expect(result[0].owner.name).toBe("Anthropic")
    expect(result[0].plugins).toHaveLength(1)
    expect(result[0].autoUpdate).toBe(true)
  })

  it("여러 마켓플레이스를 반환", async () => {
    const cachePath = path.join(tmpGlobal, ".claude", "plugins", "cache")
    await writeJson(path.join(cachePath, "mkt-a", "marketplace.json"), {
      name: "mkt-a",
      owner: { name: "Author A" },
      plugins: [],
    })
    await writeJson(path.join(cachePath, "mkt-b", "marketplace.json"), {
      name: "mkt-b",
      owner: { name: "Author B" },
      plugins: [{ id: "x" }],
    })

    const result = await getMarketplaces()

    expect(result).toHaveLength(2)
    const names = result.map((m) => m.name).sort()
    expect(names).toEqual(["mkt-a", "mkt-b"])
  })

  it("marketplace.json이 잘못된 JSON이면 해당 항목만 스킵", async () => {
    const cachePath = path.join(tmpGlobal, ".claude", "plugins", "cache")
    await writeJson(path.join(cachePath, "good", "marketplace.json"), {
      name: "good",
      owner: { name: "Good Author" },
      plugins: [],
    })
    await writeFile(
      path.join(cachePath, "bad", "marketplace.json"),
      "{ invalid json !!!",
    )

    const result = await getMarketplaces()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("good")
  })

  it("marketplace.json이 없는 디렉토리는 스킵", async () => {
    const cachePath = path.join(tmpGlobal, ".claude", "plugins", "cache")
    await fs.mkdir(path.join(cachePath, "empty-dir"), { recursive: true })
    await writeJson(path.join(cachePath, "valid", "marketplace.json"), {
      name: "valid",
      owner: { name: "Author" },
      plugins: [],
    })

    const result = await getMarketplaces()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("valid")
  })
})

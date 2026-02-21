import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAgentFiles,
  getClaudeMd,
  getGlobalConfigPath,
  getMcpServers,
  getOverview,
  getPlugins,
  getProjectConfigPath,
  scanMdDir,
} from '@/services/config-service'

// ── tmp 디렉토리 기반 테스트 헬퍼 ──

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'agentfiles-test-'))
}

async function removeTmpDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
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

  vi.spyOn(os, 'homedir').mockReturnValue(tmpGlobal)
  vi.spyOn(process, 'cwd').mockReturnValue(tmpProject)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all([removeTmpDir(tmpGlobal), removeTmpDir(tmpProject)])
})

// ── 경로 헬퍼 ──

describe('getGlobalConfigPath / getProjectConfigPath', () => {
  it('글로벌 경로: homedir/.claude 반환', () => {
    expect(getGlobalConfigPath()).toBe(path.join(tmpGlobal, '.claude'))
  })

  it('프로젝트 경로: cwd/.claude 반환', () => {
    expect(getProjectConfigPath()).toBe(path.join(tmpProject, '.claude'))
  })
})

// ── getClaudeMd ──

describe('getClaudeMd', () => {
  it('글로벌 CLAUDE.md 정상 읽기', async () => {
    const claudePath = path.join(tmpGlobal, '.claude', 'CLAUDE.md')
    await writeFile(claudePath, '# Global Claude\nHello world')

    const result = await getClaudeMd('global')

    expect(result).not.toBeNull()
    expect(result?.scope).toBe('global')
    expect(result?.path).toBe(claudePath)
    expect(result?.content).toBe('# Global Claude\nHello world')
    expect(result?.size).toBeGreaterThan(0)
    expect(result?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('프로젝트 CLAUDE.md 정상 읽기', async () => {
    const claudePath = path.join(tmpProject, '.claude', 'CLAUDE.md')
    await writeFile(claudePath, '# Project Claude')

    const result = await getClaudeMd('project')

    expect(result?.scope).toBe('project')
    expect(result?.content).toBe('# Project Claude')
  })

  it('파일 없으면 null 반환', async () => {
    const result = await getClaudeMd('global')
    expect(result).toBeNull()
  })

  it('프로젝트 파일 없으면 null 반환', async () => {
    const result = await getClaudeMd('project')
    expect(result).toBeNull()
  })
})

// ── scanMdDir ──

describe('scanMdDir', () => {
  it('존재하지 않는 디렉토리 → 빈 배열', async () => {
    const result = await scanMdDir('/nonexistent/path', 'command')
    expect(result).toEqual([])
  })

  it('빈 디렉토리 → 빈 배열', async () => {
    const emptyDir = path.join(tmpGlobal, 'empty')
    await fs.mkdir(emptyDir, { recursive: true })

    const result = await scanMdDir(emptyDir, 'command')
    expect(result).toEqual([])
  })

  it('frontmatter 없는 md 파일 정상 처리', async () => {
    const dir = path.join(tmpGlobal, 'commands')
    await writeFile(
      path.join(dir, 'simple.md'),
      '# Simple Command\nNo frontmatter here',
    )

    const result = await scanMdDir(dir, 'command')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('simple')
    expect(result[0].frontmatter).toBeUndefined()
    expect(result[0].type).toBe('command')
    expect(result[0].isSymlink).toBe(false)
  })

  it('frontmatter 있는 md 파일 파싱', async () => {
    const dir = path.join(tmpGlobal, 'commands')
    await writeFile(
      path.join(dir, 'commit.md'),
      '---\nname: commit\ndescription: Git commit helper\n---\n# Commit',
    )

    const result = await scanMdDir(dir, 'command')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('commit')
    expect(result[0].frontmatter?.name).toBe('commit')
    expect(result[0].frontmatter?.description).toBe('Git commit helper')
  })

  it('서브폴더명이 네임스페이스로 설정됨', async () => {
    const dir = path.join(tmpGlobal, 'commands')
    await writeFile(path.join(dir, 'ys', 'commit.md'), '# Commit')
    await writeFile(path.join(dir, 'ys', 'review-pr.md'), '# Review PR')

    const result = await scanMdDir(dir, 'command')

    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name).sort()
    expect(names).toEqual(['commit', 'review-pr'])
    for (const r of result) {
      expect(r.namespace).toBe('ys')
    }
  })

  it('루트 파일은 namespace 없음', async () => {
    const dir = path.join(tmpGlobal, 'commands')
    await writeFile(path.join(dir, 'root-cmd.md'), '# Root')

    const result = await scanMdDir(dir, 'command')

    expect(result[0].namespace).toBeUndefined()
  })

  it('여러 중첩 폴더 처리', async () => {
    const dir = path.join(tmpGlobal, 'commands')
    await writeFile(path.join(dir, 'ns1', 'cmd1.md'), '# Cmd1')
    await writeFile(path.join(dir, 'ns2', 'cmd2.md'), '# Cmd2')
    await writeFile(path.join(dir, 'root.md'), '# Root')

    const result = await scanMdDir(dir, 'command')

    expect(result).toHaveLength(3)
    const ns1 = result.find((r) => r.name === 'cmd1')
    const ns2 = result.find((r) => r.name === 'cmd2')
    const root = result.find((r) => r.name === 'root')
    expect(ns1?.namespace).toBe('ns1')
    expect(ns2?.namespace).toBe('ns2')
    expect(root?.namespace).toBeUndefined()
  })

  it('agent 타입으로 스캔', async () => {
    const dir = path.join(tmpGlobal, 'agents')
    await writeFile(
      path.join(dir, 'my-agent.md'),
      '---\ndescription: My agent\n---\n',
    )

    const result = await scanMdDir(dir, 'agent')

    expect(result[0].type).toBe('agent')
    expect(result[0].name).toBe('my-agent')
  })

  it('symlink md 파일 처리', async () => {
    const dir = path.join(tmpGlobal, 'skills')
    const targetFile = path.join(tmpGlobal, 'actual-skill.md')
    const symlinkFile = path.join(dir, 'find-skills.md')

    await writeFile(targetFile, '# Actual Skill')
    await fs.mkdir(dir, { recursive: true })
    await fs.symlink(targetFile, symlinkFile)

    const result = await scanMdDir(dir, 'skill')

    expect(result).toHaveLength(1)
    expect(result[0].isSymlink).toBe(true)
    expect(result[0].symlinkTarget).toBe(targetFile)
    expect(result[0].name).toBe('find-skills')
  })
})

// ── getPlugins ──

describe('getPlugins', () => {
  it('installed_plugins.json 없으면 빈 배열', async () => {
    const result = await getPlugins()
    expect(result).toEqual([])
  })

  it('버전2 포맷 플러그인 파싱', async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        'my-plugin@marketplace': [
          {
            scope: 'user',
            installPath: '/some/path',
            version: 'abc123',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-02T00:00:00.000Z',
            gitCommitSha: 'abc123def456',
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, '.claude', 'plugins', 'installed_plugins.json'),
      pluginsJson,
    )

    const result = await getPlugins()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('my-plugin@marketplace')
    expect(result[0].name).toBe('my-plugin')
    expect(result[0].marketplace).toBe('marketplace')
    expect(result[0].scope).toBe('user')
    expect(result[0].enabled).toBe(false) // settings.json 없음
  })

  it('settings.json enabledPlugins(객체) 기반 enabled 필드 설정', async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        'plugin-a@mkt': [
          {
            scope: 'user',
            installPath: '/p/a',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha1',
          },
        ],
        'plugin-b@mkt': [
          {
            scope: 'user',
            installPath: '/p/b',
            version: 'v2',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha2',
          },
        ],
      },
    }
    const settingsJson = {
      enabledPlugins: {
        'plugin-a@mkt': true,
        'plugin-b@mkt': false,
      },
    }

    await writeJson(
      path.join(tmpGlobal, '.claude', 'plugins', 'installed_plugins.json'),
      pluginsJson,
    )
    await writeJson(
      path.join(tmpGlobal, '.claude', 'settings.json'),
      settingsJson,
    )

    const result = await getPlugins()

    const pluginA = result.find((p) => p.id === 'plugin-a@mkt')
    const pluginB = result.find((p) => p.id === 'plugin-b@mkt')
    expect(pluginA?.enabled).toBe(true)
    expect(pluginB?.enabled).toBe(false)
  })

  it('settings.json enabledPlugins(배열) 기반 enabled 필드 설정', async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        'plugin-x@mkt': [
          {
            scope: 'user',
            installPath: '/p/x',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha1',
          },
        ],
      },
    }
    const settingsJson = {
      enabledPlugins: ['plugin-x@mkt'],
    }

    await writeJson(
      path.join(tmpGlobal, '.claude', 'plugins', 'installed_plugins.json'),
      pluginsJson,
    )
    await writeJson(
      path.join(tmpGlobal, '.claude', 'settings.json'),
      settingsJson,
    )

    const result = await getPlugins()

    expect(result[0].enabled).toBe(true)
  })

  it('project 스코프 플러그인 처리', async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        'proj-plugin@mkt': [
          {
            scope: 'project',
            projectPath: '/some/project',
            installPath: '/p/proj',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha1',
          },
        ],
      },
    }

    await writeJson(
      path.join(tmpGlobal, '.claude', 'plugins', 'installed_plugins.json'),
      pluginsJson,
    )

    const result = await getPlugins()

    expect(result[0].scope).toBe('project')
    expect(result[0].projectPath).toBe('/some/project')
  })
})

// ── getMcpServers ──

describe('getMcpServers', () => {
  it('settings.json 없으면 빈 배열', async () => {
    const result = await getMcpServers()
    expect(result).toEqual([])
  })

  it('글로벌 stdio MCP 서버 파싱', async () => {
    const settings = {
      mcpServers: {
        context7: {
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp@latest'],
        },
      },
    }
    await writeJson(path.join(tmpGlobal, '.claude', 'settings.json'), settings)

    const result = await getMcpServers()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('context7')
    expect(result[0].scope).toBe('global')
    expect(result[0].type).toBe('stdio')
    expect(result[0].command).toBe('npx')
    expect(result[0].args).toEqual(['-y', '@upstash/context7-mcp@latest'])
  })

  it('SSE MCP 서버 파싱 (url 기반)', async () => {
    const settings = {
      mcpServers: {
        'sse-server': {
          url: 'https://example.com/mcp/sse',
        },
      },
    }
    await writeJson(path.join(tmpGlobal, '.claude', 'settings.json'), settings)

    const result = await getMcpServers()

    expect(result[0].type).toBe('sse')
    expect(result[0].url).toBe('https://example.com/mcp/sse')
  })

  it('streamable-http MCP 서버 파싱', async () => {
    const settings = {
      mcpServers: {
        'http-server': {
          url: 'https://example.com/mcp',
          transportType: 'streamable-http',
        },
      },
    }
    await writeJson(path.join(tmpGlobal, '.claude', 'settings.json'), settings)

    const result = await getMcpServers()

    expect(result[0].type).toBe('streamable-http')
  })

  it('글로벌 + 프로젝트 MCP 서버 합산', async () => {
    const globalSettings = {
      mcpServers: {
        'global-mcp': { command: 'node', args: ['global.js'] },
      },
    }
    const projectSettings = {
      mcpServers: {
        'project-mcp': { command: 'node', args: ['project.js'] },
      },
    }

    await writeJson(
      path.join(tmpGlobal, '.claude', 'settings.json'),
      globalSettings,
    )
    await writeJson(
      path.join(tmpProject, '.claude', 'settings.json'),
      projectSettings,
    )

    const result = await getMcpServers()

    expect(result).toHaveLength(2)
    const globalMcp = result.find((s) => s.name === 'global-mcp')
    const projectMcp = result.find((s) => s.name === 'project-mcp')
    expect(globalMcp?.scope).toBe('global')
    expect(projectMcp?.scope).toBe('project')
  })

  it('env 필드 포함 파싱', async () => {
    const settings = {
      mcpServers: {
        'env-mcp': {
          command: 'node',
          args: ['server.js'],
          env: { API_KEY: 'secret', DEBUG: '1' },
        },
      },
    }
    await writeJson(path.join(tmpGlobal, '.claude', 'settings.json'), settings)

    const result = await getMcpServers()

    expect(result[0].env).toEqual({ API_KEY: 'secret', DEBUG: '1' })
  })
})

// ── getOverview ──

describe('getOverview', () => {
  it('빈 환경에서 Overview 반환 (모두 0)', async () => {
    const result = await getOverview()

    expect(result.claudeMd.global).toBeUndefined()
    expect(result.claudeMd.project).toBeUndefined()
    expect(result.plugins.total).toBe(0)
    expect(result.mcpServers.total).toBe(0)
    expect(result.agents.total).toBe(0)
    expect(result.commands.total).toBe(0)
    expect(result.skills.total).toBe(0)
    expect(result.conflictCount).toBe(0)
  })

  it('글로벌 + 프로젝트 CLAUDE.md 포함', async () => {
    await writeFile(path.join(tmpGlobal, '.claude', 'CLAUDE.md'), '# Global')
    await writeFile(path.join(tmpProject, '.claude', 'CLAUDE.md'), '# Project')

    const result = await getOverview()

    expect(result.claudeMd.global).toBeDefined()
    expect(result.claudeMd.project).toBeDefined()
    expect(result.claudeMd.global?.scope).toBe('global')
    expect(result.claudeMd.project?.scope).toBe('project')
  })

  it('agents 글로벌/프로젝트 카운트', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'agents', 'agent1.md'),
      '# Agent1',
    )
    await writeFile(
      path.join(tmpGlobal, '.claude', 'agents', 'agent2.md'),
      '# Agent2',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'agents', 'agent3.md'),
      '# Agent3',
    )

    const result = await getOverview()

    expect(result.agents.global).toBe(2)
    expect(result.agents.project).toBe(1)
    expect(result.agents.total).toBe(3)
  })

  it('commands 글로벌/프로젝트 카운트', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'cmd1.md'),
      '# Cmd1',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'commands', 'cmd2.md'),
      '# Cmd2',
    )

    const result = await getOverview()

    expect(result.commands.global).toBe(1)
    expect(result.commands.project).toBe(1)
    expect(result.commands.total).toBe(2)
  })

  it('충돌 감지: 양쪽에 같은 이름의 command 존재', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'commit.md'),
      '# Global Commit',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'commands', 'commit.md'),
      '# Project Commit',
    )
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'unique.md'),
      '# Unique',
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(1)
  })

  it('충돌 없는 경우 conflictCount = 0', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'global-only.md'),
      '# Global',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'commands', 'project-only.md'),
      '# Project',
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(0)
  })

  it('여러 타입의 충돌 합산', async () => {
    // agents 충돌 1개
    await writeFile(
      path.join(tmpGlobal, '.claude', 'agents', 'same-agent.md'),
      '# Agent',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'agents', 'same-agent.md'),
      '# Agent',
    )
    // commands 충돌 2개
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'cmd-a.md'),
      '# CmdA',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'commands', 'cmd-a.md'),
      '# CmdA',
    )
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'cmd-b.md'),
      '# CmdB',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'commands', 'cmd-b.md'),
      '# CmdB',
    )

    const result = await getOverview()

    expect(result.conflictCount).toBe(3)
  })

  it('MCP 서버 카운트 포함', async () => {
    const globalSettings = {
      mcpServers: {
        'g-mcp-1': { command: 'node', args: [] },
        'g-mcp-2': { command: 'python', args: [] },
      },
    }
    const projectSettings = {
      mcpServers: {
        'p-mcp-1': { command: 'deno', args: [] },
      },
    }
    await writeJson(
      path.join(tmpGlobal, '.claude', 'settings.json'),
      globalSettings,
    )
    await writeJson(
      path.join(tmpProject, '.claude', 'settings.json'),
      projectSettings,
    )

    const result = await getOverview()

    expect(result.mcpServers.global).toBe(2)
    expect(result.mcpServers.project).toBe(1)
    expect(result.mcpServers.total).toBe(3)
  })

  it('plugins 카운트 포함', async () => {
    const pluginsJson = {
      version: 2,
      plugins: {
        'plugin-user@mkt': [
          {
            scope: 'user',
            installPath: '/p/u',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha1',
          },
        ],
        'plugin-proj@mkt': [
          {
            scope: 'project',
            projectPath: '/some/proj',
            installPath: '/p/p',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
            gitCommitSha: 'sha2',
          },
        ],
      },
    }
    await writeJson(
      path.join(tmpGlobal, '.claude', 'plugins', 'installed_plugins.json'),
      pluginsJson,
    )

    const result = await getOverview()

    expect(result.plugins.total).toBe(2)
    expect(result.plugins.user).toBe(1)
    expect(result.plugins.project).toBe(1)
  })
})

// ── getAgentFiles ──

describe('getAgentFiles', () => {
  it('agent 타입 글로벌+프로젝트 합산', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'agents', 'g-agent.md'),
      '# Global Agent',
    )
    await writeFile(
      path.join(tmpProject, '.claude', 'agents', 'p-agent.md'),
      '# Project Agent',
    )

    const result = await getAgentFiles('agent')

    expect(result).toHaveLength(2)
    const globalAgent = result.find((a) => a.name === 'g-agent')
    const projectAgent = result.find((a) => a.name === 'p-agent')
    expect(globalAgent?.scope).toBe('global')
    expect(projectAgent?.scope).toBe('project')
  })

  it('command 타입 스캔', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'commands', 'ns', 'my-cmd.md'),
      '# MyCmd',
    )

    const result = await getAgentFiles('command')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('my-cmd')
    expect(result[0].namespace).toBe('ns')
    expect(result[0].type).toBe('command')
  })

  it('skill 타입 스캔', async () => {
    await writeFile(
      path.join(tmpGlobal, '.claude', 'skills', 'my-skill.md'),
      '# MySkill',
    )

    const result = await getAgentFiles('skill')

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('skill')
  })
})

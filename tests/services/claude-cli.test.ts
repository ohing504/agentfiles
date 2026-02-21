import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:child_process')

import { execFile } from 'node:child_process'
import {
  checkCliAvailable,
  mcpAdd,
  mcpRemove,
  pluginToggle,
} from '@/services/claude-cli'

const mockExecFile = vi.mocked(execFile)

type ExecFileCallback = (
  err: Error | null,
  stdout: string,
  stderr: string,
) => void

function mockSuccess(stdout: string, stderr = '') {
  mockExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      ;(callback as ExecFileCallback)(null, stdout, stderr)
      return {} as ReturnType<typeof execFile>
    },
  )
}

function mockFailure(message: string) {
  mockExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      ;(callback as ExecFileCallback)(new Error(message), '', '')
      return {} as ReturnType<typeof execFile>
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkCliAvailable', () => {
  it('CLI가 있으면 available: true와 버전을 반환한다', async () => {
    mockSuccess('claude/1.2.3\n')
    const result = await checkCliAvailable()
    expect(result.available).toBe(true)
    expect(result.version).toBe('claude/1.2.3')
  })

  it('CLI가 없으면 available: false와 reason을 반환한다', async () => {
    mockFailure('command not found: claude')
    const result = await checkCliAvailable()
    expect(result.available).toBe(false)
    expect(result.reason).toContain('Claude CLI not found')
  })
})

describe('mcpAdd', () => {
  it('stdio MCP를 올바른 args로 호출한다', async () => {
    mockSuccess('')
    await mcpAdd('my-server', { command: 'npx', args: ['my-pkg'] }, 'global')
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['mcp', 'add', 'my-server', '-s', 'user', '--', 'npx', 'my-pkg'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('project scope는 -s project로 매핑한다', async () => {
    mockSuccess('')
    await mcpAdd(
      'proj-server',
      { command: 'node', args: ['server.js'] },
      'project',
    )
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['mcp', 'add', 'proj-server', '-s', 'project', '--', 'node', 'server.js'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('env가 있으면 -e KEY=VALUE 플래그를 추가한다', async () => {
    mockSuccess('')
    await mcpAdd(
      'env-server',
      { command: 'run', args: [], env: { TOKEN: 'abc', PORT: '3000' } },
      'global',
    )
    const callArgs = mockExecFile.mock.calls[0][1] as string[]
    expect(callArgs).toContain('-e')
    expect(callArgs).toContain('TOKEN=abc')
    expect(callArgs).toContain('PORT=3000')
  })
})

describe('mcpRemove', () => {
  it('global scope는 -s user로 매핑한다', async () => {
    mockSuccess('')
    await mcpRemove('my-server', 'global')
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['mcp', 'remove', 'my-server', '-s', 'user'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('project scope는 -s project로 매핑한다', async () => {
    mockSuccess('')
    await mcpRemove('proj-server', 'project')
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['mcp', 'remove', 'proj-server', '-s', 'project'],
      expect.any(Object),
      expect.any(Function),
    )
  })
})

describe('pluginToggle', () => {
  it('enable=true이면 plugin enable을 호출한다', async () => {
    mockSuccess('')
    await pluginToggle('my-plugin@vendor', true)
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['plugin', 'enable', 'my-plugin@vendor'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('enable=false이면 plugin disable을 호출한다', async () => {
    mockSuccess('')
    await pluginToggle('my-plugin@vendor', false)
    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      ['plugin', 'disable', 'my-plugin@vendor'],
      expect.any(Object),
      expect.any(Function),
    )
  })
})

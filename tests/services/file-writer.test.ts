import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createFile,
  deleteFile,
  renameFile,
  writeMarkdown,
} from '@/services/file-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentfiles-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeMarkdown', () => {
  it('파일을 생성하고 내용을 저장한다', async () => {
    const filePath = path.join(tmpDir, 'test.md')
    const content = '# Hello\n\nWorld'
    await writeMarkdown(filePath, content)
    const result = await fs.readFile(filePath, 'utf-8')
    expect(result).toBe(content)
  })

  it('디렉토리가 없으면 자동 생성한다', async () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'test.md')
    await writeMarkdown(filePath, '# Nested')
    const result = await fs.readFile(filePath, 'utf-8')
    expect(result).toBe('# Nested')
  })
})

describe('createFile', () => {
  it('파일을 생성하고 절대 경로를 반환한다', async () => {
    const returnedPath = await createFile(tmpDir, 'my-agent', '# Agent')
    expect(returnedPath).toBe(path.join(tmpDir, 'my-agent.md'))
    const result = await fs.readFile(returnedPath, 'utf-8')
    expect(result).toBe('# Agent')
  })

  it('basePath가 없으면 디렉토리를 자동 생성한다', async () => {
    const basePath = path.join(tmpDir, 'agents', 'global')
    const returnedPath = await createFile(basePath, 'new-agent', '# New')
    const result = await fs.readFile(returnedPath, 'utf-8')
    expect(result).toBe('# New')
  })

  it('반환된 경로가 .md 확장자를 가진다', async () => {
    const returnedPath = await createFile(tmpDir, 'my-file', '')
    expect(returnedPath.endsWith('.md')).toBe(true)
  })
})

describe('deleteFile', () => {
  it('파일을 삭제한다', async () => {
    const filePath = path.join(tmpDir, 'to-delete.md')
    await fs.writeFile(filePath, 'content')
    await deleteFile(filePath)
    await expect(fs.access(filePath)).rejects.toThrow()
  })

  it('존재하지 않는 파일 삭제 시 에러를 throw한다', async () => {
    const filePath = path.join(tmpDir, 'non-existent.md')
    await expect(deleteFile(filePath)).rejects.toThrow()
  })
})

describe('renameFile', () => {
  it('파일을 새 경로로 이동한다', async () => {
    const oldPath = path.join(tmpDir, 'old.md')
    const newPath = path.join(tmpDir, 'new.md')
    await fs.writeFile(oldPath, '# Content')
    await renameFile(oldPath, newPath)
    await expect(fs.access(oldPath)).rejects.toThrow()
    const result = await fs.readFile(newPath, 'utf-8')
    expect(result).toBe('# Content')
  })

  it('새 경로의 디렉토리가 없으면 자동 생성한다', async () => {
    const oldPath = path.join(tmpDir, 'old.md')
    const newPath = path.join(tmpDir, 'subdir', 'new.md')
    await fs.writeFile(oldPath, '# Content')
    await renameFile(oldPath, newPath)
    const result = await fs.readFile(newPath, 'utf-8')
    expect(result).toBe('# Content')
  })
})

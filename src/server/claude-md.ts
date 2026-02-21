import { createServerFn } from '@tanstack/react-start'
import type { Scope } from '@/shared/types'

export const getClaudeMdFn = createServerFn({ method: 'GET' })
  .validator((data: { scope: Scope }) => data)
  .handler(async ({ data }) => {
    const { getClaudeMd } = await import('@/services/config-service')
    return getClaudeMd(data.scope)
  })

export const saveClaudeMdFn = createServerFn({ method: 'POST' })
  .validator((data: { scope: Scope; content: string }) => data)
  .handler(async ({ data }) => {
    const { getGlobalConfigPath, getProjectConfigPath } = await import(
      '@/services/config-service'
    )
    const { writeMarkdown } = await import('@/services/file-writer')
    const path = await import('node:path')

    const basePath =
      data.scope === 'global' ? getGlobalConfigPath() : getProjectConfigPath()
    const filePath = path.join(basePath, 'CLAUDE.md')
    await writeMarkdown(filePath, data.content)
    return { success: true }
  })

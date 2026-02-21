import { createServerFn } from '@tanstack/react-start'
import type { Scope } from '@/shared/types'

export const getMcpServersFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getMcpServers } = await import('@/services/config-service')
    return getMcpServers()
  },
)

export const addMcpServerFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      scope: Scope
    }) => data,
  )
  .handler(async ({ data }) => {
    const { mcpAdd } = await import('@/services/claude-cli')
    await mcpAdd(
      data.name,
      { command: data.command, args: data.args, env: data.env },
      data.scope,
    )
    return { success: true }
  })

export const removeMcpServerFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string; scope: Scope }) => data)
  .handler(async ({ data }) => {
    const { mcpRemove } = await import('@/services/claude-cli')
    await mcpRemove(data.name, data.scope)
    return { success: true }
  })

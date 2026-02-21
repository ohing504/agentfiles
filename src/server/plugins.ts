import { createServerFn } from '@tanstack/react-start'

export const getPluginsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getPlugins } = await import('@/services/config-service')
    return getPlugins()
  },
)

export const togglePluginFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; enable: boolean }) => data)
  .handler(async ({ data }) => {
    const { pluginToggle } = await import('@/services/claude-cli')
    await pluginToggle(data.id, data.enable)
    return { success: true }
  })

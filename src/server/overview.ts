import { createServerFn } from '@tanstack/react-start'

export const getOverview = createServerFn({ method: 'GET' }).handler(
  async () => {
    // Phase 4에서 구현
    return { plugins: 0, mcpServers: 0, agents: 0, commands: 0, skills: 0 }
  },
)

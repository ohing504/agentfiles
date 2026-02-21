import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/commands')({ component: CommandsPage })

function CommandsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Commands</h1>
      <p className="text-muted-foreground">Phase 9에서 구현 예정</p>
    </div>
  )
}

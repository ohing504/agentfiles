// src/features/dashboard/components/OverviewPanel.tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface OverviewPanelProps {
  title: string
  count?: number
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function OverviewPanel({
  title,
  count,
  actions,
  children,
  className,
}: OverviewPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-lg overflow-hidden min-h-0",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-[10px] text-muted-foreground">({count})</span>
          )}
        </div>
        {actions}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-1">{children}</div>
    </div>
  )
}

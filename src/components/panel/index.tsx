import type { LucideIcon } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>
}

function PanelHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-2 px-2.5 py-2 shrink-0", className)}
    >
      {children}
    </div>
  )
}

function PanelTitle({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-1.5 text-sm font-medium", className)}
    >
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      {children}
    </div>
  )
}

function PanelCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

function PanelActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("ml-auto flex items-center gap-1", className)}>
      {children}
    </div>
  )
}

function PanelContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  )
}

function PanelEmpty({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex-1 flex items-center justify-center p-4", className)}
    >
      {children}
    </div>
  )
}

export {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelCount,
  PanelActions,
  PanelContent,
  PanelEmpty,
}

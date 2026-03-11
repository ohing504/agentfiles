import type { LucideIcon } from "lucide-react"
import { ChevronsRight } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function DetailPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>
}

function DetailPanelHeader({
  onClose,
  children,
  className,
}: {
  onClose?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 h-12 px-3 border-b shrink-0",
        className,
      )}
    >
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
        >
          <ChevronsRight className="size-4" />
        </Button>
      )}
      {children}
    </div>
  )
}

function DetailPanelTitle({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", className)}>
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
      <SheetTitle className="text-sm font-medium truncate">
        {children}
      </SheetTitle>
    </div>
  )
}

function DetailPanelActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1 shrink-0", className)}>
      {children}
    </div>
  )
}

function DetailPanelContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)}>
      {children}
    </div>
  )
}

export {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelTitle,
  DetailPanelActions,
  DetailPanelContent,
}

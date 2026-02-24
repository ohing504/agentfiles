import { ChevronRight } from "lucide-react"
import type * as React from "react"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// ── Root container ──────────────────────────────────────────────────────────

function Tree({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul className={cn("flex min-w-0 flex-col gap-0.5", className)} {...props} />
  )
}

// ── Folder (collapsible group) ──────────────────────────────────────────────

function TreeFolder({
  icon: Icon,
  label,
  count,
  selected,
  defaultOpen = true,
  open,
  onOpenChange,
  onClick,
  hideChevron,
  children,
}: {
  icon: React.ElementType
  label: string
  count?: number
  selected?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClick?: () => void
  hideChevron?: boolean
  children: React.ReactNode
}) {
  const controlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlled ? open : internalOpen

  function toggle() {
    const next = !isOpen
    if (!controlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  // hideChevron mode: chevron on right toggles, row click only selects
  if (hideChevron) {
    return (
      <li className="list-none">
        <Collapsible open={isOpen}>
          <div
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50",
              selected && "bg-accent text-accent-foreground",
            )}
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-1.5 min-w-0"
              onClick={onClick}
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {label}
              </span>
            </button>
            <button
              type="button"
              onClick={toggle}
              className="shrink-0 rounded p-0.5 hover:bg-muted"
            >
              <ChevronRight
                className={cn(
                  "size-3.5 text-muted-foreground/60 transition-transform",
                  isOpen && "rotate-90",
                )}
              />
            </button>
          </div>
          <CollapsibleContent>
            <ul className="flex flex-col gap-0.5 border-l border-border py-0.5 ml-2 pl-2">
              {children}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </li>
    )
  }

  // Default mode: entire row is CollapsibleTrigger (toggle + onClick)
  return (
    <li className="list-none">
      <Collapsible
        defaultOpen={controlled ? undefined : defaultOpen}
        open={controlled ? open : undefined}
        onOpenChange={(o) => {
          onOpenChange?.(o)
          onClick?.()
        }}
      >
        <CollapsibleTrigger
          data-active={selected || undefined}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 data-[active]:bg-accent data-[active]:text-accent-foreground [&[data-state=open]>svg:first-child]:rotate-90"
        >
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform" />
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          {count != null && count > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              {count}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="flex flex-col gap-0.5 border-l border-border py-0.5 ml-3 pl-2">
            {children}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

// ── File (leaf item) ────────────────────────────────────────────────────────

function TreeFile({
  icon: Icon,
  label,
  selected,
  onClick,
  trailing,
  muted,
}: {
  icon: React.ElementType
  label: string
  selected?: boolean
  onClick?: () => void
  trailing?: React.ReactNode
  muted?: boolean
}) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onClick}
        data-active={selected || undefined}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 active:bg-muted data-[active]:bg-accent data-[active]:text-accent-foreground${muted ? " opacity-60" : ""}`}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs">{label}</span>
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </button>
    </li>
  )
}

export { Tree, TreeFile, TreeFolder }

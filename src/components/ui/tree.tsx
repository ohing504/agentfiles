import { ChevronRight } from "lucide-react"
import type * as React from "react"

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
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType
  label: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <li className="list-none">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 [&[data-state=open]>svg:first-child]:rotate-90">
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
          <ul className="ml-3 flex flex-col gap-0.5 border-l border-border py-0.5 pl-2">
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
}: {
  icon: React.ElementType
  label: string
  selected?: boolean
  onClick?: () => void
  trailing?: React.ReactNode
}) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onClick}
        data-active={selected || undefined}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 active:bg-muted data-[active]:bg-accent data-[active]:text-accent-foreground"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs">{label}</span>
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </button>
    </li>
  )
}

export { Tree, TreeFile, TreeFolder }

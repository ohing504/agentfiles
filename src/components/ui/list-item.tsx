import * as React from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ListItemProps {
  icon: React.ElementType
  label: string
  description?: string
  trailing?: React.ReactNode
  tooltip?: string
  selected?: boolean
  onClick?: () => void
  open?: boolean
  children?: React.ReactNode
  className?: string
}

export function ListItem({
  icon: Icon,
  label,
  description,
  trailing,
  tooltip,
  selected,
  onClick,
  open,
  children,
  className,
}: ListItemProps) {
  // Item (Slot.Root when asChild) properly forwards ref via ...props spread,
  // so TooltipTrigger/CollapsibleTrigger asChild can chain through it.
  const item = (
    <Item
      asChild
      variant="default"
      size="xs"
      className={cn(
        "rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        selected && "bg-accent text-accent-foreground font-medium",
        className,
      )}
    >
      <button type="button" onClick={onClick} className="text-left">
        <ItemMedia>
          <Icon className="text-muted-foreground" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-normal leading-tight">{label}</ItemTitle>
          {description && (
            <ItemDescription className="text-[10px] leading-tight">
              {description}
            </ItemDescription>
          )}
        </ItemContent>
        {trailing && <ItemActions>{trailing}</ItemActions>}
      </button>
    </Item>
  )

  // Collapsible with optional tooltip
  if (children !== undefined && open !== undefined) {
    return (
      <Collapsible open={open} className="group/collapsible">
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <CollapsibleTrigger asChild>{item}</CollapsibleTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <CollapsibleTrigger asChild>{item}</CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <ul className="ml-3.5 pl-2.5 py-0.5 flex flex-col gap-0.5">
            {children}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // Simple with tooltip
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return item
}

interface ListSubItemProps {
  icon: React.ElementType
  label: string
  trailing?: React.ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function ListSubItem({
  icon: Icon,
  label,
  trailing,
  selected,
  onClick,
  className,
}: ListSubItemProps) {
  return (
    <li>
      <Item
        asChild
        variant="default"
        size="xs"
        className={cn(
          "rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
          selected && "bg-accent text-accent-foreground font-medium",
          className,
        )}
      >
        <button type="button" onClick={onClick} className="text-left">
          <ItemMedia>
            <Icon className="text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="font-normal leading-tight">{label}</ItemTitle>
          </ItemContent>
          {trailing && <ItemActions>{trailing}</ItemActions>}
        </button>
      </Item>
    </li>
  )
}

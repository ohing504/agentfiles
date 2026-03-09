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
  iconClassName?: string
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
  iconClassName,
}: ListItemProps) {
  // Item (Slot.Root when asChild) properly forwards ref via ...props spread,
  // so TooltipTrigger/CollapsibleTrigger asChild can chain through it.
  const item = (
    <Item
      asChild
      variant="default"
      size="xs"
      className={cn(
        "group/item rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        selected && "bg-accent text-accent-foreground font-medium",
        className,
      )}
    >
      <button type="button" onClick={onClick} className="text-left">
        <ItemMedia>
          <Icon className={iconClassName ?? "text-muted-foreground"} />
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
            <TooltipContent side="right" className="whitespace-pre-line max-w-xs">{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <CollapsibleTrigger asChild>{item}</CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <ul className="ml-3.5 pl-2.5 py-0.5 flex flex-col gap-0.5 list-none">
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
        <TooltipContent side="right" className="whitespace-pre-line max-w-xs">
          {tooltip}
        </TooltipContent>
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
  iconClassName?: string
  onContextMenu?: React.MouseEventHandler<HTMLLIElement>
}

export function ListSubItem({
  icon: Icon,
  label,
  trailing,
  selected,
  onClick,
  className,
  iconClassName,
  onContextMenu,
}: ListSubItemProps) {
  return (
    <li className="group/item list-none" onContextMenu={onContextMenu}>
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
            <Icon className={iconClassName ?? "text-muted-foreground"} />
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

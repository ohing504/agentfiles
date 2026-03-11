import { Columns3Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { m } from "@/paraglide/messages"
import type { BoardColumnId } from "@/shared/types"

const COLUMN_LABELS: Record<BoardColumnId, () => string> = {
  files: () => m.board_col_files(),
  plugins: () => m.board_col_plugins(),
  mcp: () => m.board_col_mcp(),
  skills: () => m.board_col_skills(),
  agents: () => m.board_col_agents(),
  hooks: () => m.board_col_hooks(),
  memory: () => m.board_col_memory(),
  lsp: () => m.board_col_lsp(),
}

interface BoardColumnSettingsProps {
  columnOrder: BoardColumnId[]
  hiddenColumns: BoardColumnId[]
  onToggle: (id: BoardColumnId) => void
}

export function BoardColumnSettings({
  columnOrder,
  hiddenColumns,
  onToggle,
}: BoardColumnSettingsProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Columns3Icon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{m.board_columns()}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{m.board_columns()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columnOrder.map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={!hiddenColumns.includes(id)}
            onCheckedChange={() => onToggle(id)}
            onSelect={(e) => e.preventDefault()}
          >
            {COLUMN_LABELS[id]()}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

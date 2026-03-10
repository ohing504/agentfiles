// src/features/dashboard/components/DetailPanelHeader.tsx
import { ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetClose, SheetTitle } from "@/components/ui/sheet"

interface DetailPanelHeaderProps {
  title: string
  /** Actions rendered on the right side of the header */
  trailing?: React.ReactNode
}

export function DetailPanelHeader({ title, trailing }: DetailPanelHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-border">
      <SheetClose asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0">
          <ChevronsRight data-icon />
        </Button>
      </SheetClose>
      <SheetTitle className="text-sm font-semibold truncate min-w-0 flex-1">
        {title}
      </SheetTitle>
      {trailing}
    </div>
  )
}

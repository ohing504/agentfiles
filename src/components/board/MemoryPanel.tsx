import { BrainIcon } from "lucide-react"
import { ListItem } from "@/components/ui/list-item"
import { useMemoryFiles } from "@/hooks/use-config"
import { formatBytes } from "@/lib/format"
import type { DashboardDetailTarget } from "./types"

interface MemoryPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function MemoryPanel({ onSelectItem }: MemoryPanelProps) {
  const { data: files = [] } = useMemoryFiles()

  return files.length === 0 ? (
    <p className="text-xs text-muted-foreground px-2 py-2">No memory files</p>
  ) : (
    <div>
      {files.map((file) => (
        <ListItem
          key={file.name}
          icon={BrainIcon}
          label={file.name}
          trailing={
            <span className="text-[10px] text-muted-foreground">
              {formatBytes(file.size)}
            </span>
          }
          onClick={() => onSelectItem?.({ type: "memory", file })}
        />
      ))}
    </div>
  )
}

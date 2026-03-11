import type { MemoryFile } from "@/shared/types"

interface MemoryDetailViewProps {
  item: MemoryFile
  className?: string
}

export function MemoryDetailView({ item, className }: MemoryDetailViewProps) {
  return (
    <div className={`flex-1 overflow-y-auto p-4 ${className ?? ""}`}>
      <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
        {item.content}
      </pre>
    </div>
  )
}

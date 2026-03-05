import type { MemoryFile } from "@/shared/types"

interface MemoryDetailPanelProps {
  file: MemoryFile
}

export function MemoryDetailPanel({ file }: MemoryDetailPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">{file.name}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
          {file.path}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
          {file.content}
        </pre>
      </div>
    </div>
  )
}

import type { MemoryFile } from "@/shared/types"
import { DetailPanelHeader } from "./DetailPanelHeader"

interface MemoryDetailPanelProps {
  file: MemoryFile
}

export function MemoryDetailPanel({ file }: MemoryDetailPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DetailPanelHeader title={file.name} />
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
          {file.content}
        </pre>
      </div>
    </div>
  )
}

import { useFileContentQuery } from "@/features/files-editor/api/files.queries"

interface FileDetailPanelProps {
  filePath: string
}

export function FileDetailPanel({ filePath }: FileDetailPanelProps) {
  const { data, isLoading } = useFileContentQuery(filePath)
  const fileName = filePath.split("/").pop() ?? filePath

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">{fileName}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
          {filePath}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : (
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
            {data?.content}
          </pre>
        )}
      </div>
    </div>
  )
}

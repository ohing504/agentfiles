import { useFileContentQuery } from "@/features/files-editor/api/files.queries"
import { DetailPanelHeader } from "./DetailPanelHeader"

interface FileDetailPanelProps {
  filePath: string
}

export function FileDetailPanel({ filePath }: FileDetailPanelProps) {
  const { data, isLoading } = useFileContentQuery(filePath)
  const fileName = filePath.split("/").pop() ?? filePath

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DetailPanelHeader title={fileName} />
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

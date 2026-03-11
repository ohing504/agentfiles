import { FileViewer } from "@/components/FileViewer"
import { Skeleton } from "@/components/ui/skeleton"
import { useFileContentQuery } from "@/hooks/use-files"

interface FileDetailViewProps {
  item: { path: string; name: string }
  className?: string
}

export function FileDetailView({ item, className }: FileDetailViewProps) {
  const { data, isLoading } = useFileContentQuery(item.path)
  const isMarkdown = item.name.endsWith(".md")

  return (
    <div className={`flex-1 overflow-y-auto p-4 ${className ?? ""}`}>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : data ? (
        <FileViewer
          rawContent={data.content}
          fileName={item.name}
          isMarkdown={isMarkdown}
        />
      ) : null}
    </div>
  )
}

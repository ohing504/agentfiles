import { useQuery } from "@tanstack/react-query"
import { FileViewer } from "@/components/FileViewer"
import type { AgentFile, SupportingFile } from "@/shared/types"
import { extractBody } from "../constants"

export function SupportingFilePanel({
  skill,
  supportingFile,
}: {
  skill: AgentFile
  supportingFile: SupportingFile
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["supporting-file", skill.path, supportingFile.relativePath],
    queryFn: async () => {
      const { readSupportingFileFn } = await import("../api/skills.functions")
      return readSupportingFileFn({
        data: {
          skillPath: skill.path,
          relativePath: supportingFile.relativePath,
        },
      })
    },
  })

  const isMarkdown = supportingFile.name.endsWith(".md")
  const rawContent = data?.content ?? ""
  const body = isMarkdown ? extractBody(rawContent) : rawContent

  return (
    <>
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {supportingFile.relativePath}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <FileViewer
          content={isMarkdown ? body : undefined}
          rawContent={rawContent}
          fileName={supportingFile.relativePath}
          isMarkdown={isMarkdown}
          isLoading={isLoading}
          className="flex-1"
        />
      </div>
    </>
  )
}

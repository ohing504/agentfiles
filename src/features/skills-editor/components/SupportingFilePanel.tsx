import { FileViewer } from "@/components/FileViewer"
import { useSupportingFileQuery } from "../api/skills.queries"
import { extractBody } from "../constants"
import { useSkillsSelection } from "../context/SkillsContext"

export function SupportingFilePanel() {
  const { selectedSkill: skill, selectedSupportingFile: supportingFile } =
    useSkillsSelection()

  const { data, isLoading } = useSupportingFileQuery(
    skill?.path,
    supportingFile?.relativePath,
  )

  if (!skill || !supportingFile) return null

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

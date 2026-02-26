import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { useProjectContext } from "@/components/ProjectContext"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { useSkillDetailQuery } from "../api/skills.queries"
import { extractBody } from "../constants"
import { useSkillsSelection } from "../context/SkillsContext"
import { FrontmatterBadges } from "./FrontmatterBadges"

export function SkillDetailPanel() {
  const { selectedSkill: skill } = useSkillsSelection()
  const { activeProjectPath } = useProjectContext()
  const { data: itemDetail, isLoading: detailLoading } = useSkillDetailQuery(
    skill,
    activeProjectPath ?? undefined,
  )

  if (!skill) return null

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0">
      <section className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label={m.skills_scope()}>
            <span className="text-sm font-medium capitalize">
              {skill.scope}
            </span>
          </DetailField>
          <DetailField label={m.skills_last_updated()}>
            <span className="text-sm font-medium">
              {formatDate(skill.lastModified, getLocale())}
            </span>
          </DetailField>
        </dl>

        <DetailField label={m.skills_description()}>
          <span className="text-sm text-foreground">
            {skill.frontmatter?.description ? (
              String(skill.frontmatter.description)
            ) : (
              <span className="italic text-muted-foreground">
                No description
              </span>
            )}
          </span>
        </DetailField>
      </section>

      <Separator />

      <FileViewer
        content={body}
        rawContent={itemDetail?.content ?? ""}
        fileName="SKILL.md"
        isLoading={detailLoading}
        header={<FrontmatterBadges frontmatter={skill.frontmatter} />}
        className="flex-1"
      />
    </div>
  )
}

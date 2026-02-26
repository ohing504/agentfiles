import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { FrontmatterBadges } from "@/components/FrontmatterBadges"
import { Separator } from "@/components/ui/separator"
import { useAgentFileDetailQuery } from "@/hooks/use-agent-file-detail"
import { extractBody, formatDate } from "@/lib/format"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import type { AgentFile } from "@/shared/types"

interface SkillDetailViewProps {
  /** 표시할 AgentFile (skill, command, agent 모두 지원) */
  skill: AgentFile
  /** 추가 CSS 클래스 */
  className?: string
}

/**
 * AgentFile 상세를 표시하는 self-fetching 컴포넌트.
 * 내부적으로 useAgentFileDetailQuery를 호출하여 실제 파일 내용을 가져온다.
 */
export function SkillDetailView({ skill, className }: SkillDetailViewProps) {
  const { data: itemDetail, isLoading: detailLoading } =
    useAgentFileDetailQuery(skill)

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0 ${className ?? ""}`}
    >
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

import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { Separator } from "@/components/ui/separator"
import { useAgentFileDetailQuery } from "@/hooks/use-agent-file-detail"
import { extractBody, formatDate } from "@/lib/format"
import { getLocale } from "@/paraglide/runtime"
import type { AgentFile } from "@/shared/types"

interface AgentDetailViewProps {
  item: AgentFile
  className?: string
}

export function AgentDetailView({ item, className }: AgentDetailViewProps) {
  const { data: itemDetail, isLoading: detailLoading } =
    useAgentFileDetailQuery(item)

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0 ${className ?? ""}`}
    >
      <section className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label="Scope">
            <span className="text-sm font-medium capitalize">{item.scope}</span>
          </DetailField>
          <DetailField label="Last Updated">
            <span className="text-sm font-medium">
              {formatDate(item.lastModified, getLocale())}
            </span>
          </DetailField>
        </dl>

        <DetailField label="Description">
          <span className="text-sm text-foreground">
            {item.frontmatter?.description ? (
              String(item.frontmatter.description)
            ) : (
              <span className="italic text-muted-foreground">
                No description
              </span>
            )}
          </span>
        </DetailField>

        {item.frontmatter?.model && (
          <DetailField label="Model">
            <span className="text-sm font-medium">
              {String(item.frontmatter.model)}
            </span>
          </DetailField>
        )}

        {item.frontmatter?.tools && (
          <DetailField label="Tools">
            <span className="text-sm font-medium">
              {String(item.frontmatter.tools)}
            </span>
          </DetailField>
        )}

        {item.frontmatter?.permissionMode && (
          <DetailField label="Permission Mode">
            <span className="text-sm font-medium">
              {String(item.frontmatter.permissionMode)}
            </span>
          </DetailField>
        )}
      </section>

      <Separator />

      <FileViewer
        content={body}
        rawContent={itemDetail?.content ?? ""}
        fileName={`${item.name}.md`}
        isLoading={detailLoading}
        className="flex-1"
      />
    </div>
  )
}

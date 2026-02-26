import { FileViewer } from "@/components/FileViewer"
import { extractBody } from "@/lib/format"

interface AgentFileViewProps {
  /** 표시할 파일명 (확장자로 마크다운 여부 자동 감지) */
  fileName: string
  /** 파일의 raw 내용 */
  rawContent: string
  /** 로딩 상태 */
  isLoading?: boolean
  /** 추가 CSS 클래스 */
  className?: string
}

/**
 * AgentFile의 파일 내용을 표시하는 순수 컴포넌트.
 * 마크다운 파일이면 frontmatter를 제거한 본문을 preview로 표시한다.
 */
export function AgentFileView({
  fileName,
  rawContent,
  isLoading,
  className,
}: AgentFileViewProps) {
  const isMarkdown = fileName.endsWith(".md")
  const body = isMarkdown ? extractBody(rawContent) : rawContent

  return (
    <FileViewer
      content={isMarkdown ? body : undefined}
      rawContent={rawContent}
      fileName={fileName}
      isMarkdown={isMarkdown}
      isLoading={isLoading}
      className={className}
    />
  )
}

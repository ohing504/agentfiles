import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-sm prose-invert max-w-none
        prose-headings:text-foreground prose-p:text-muted-foreground
        prose-a:text-primary prose-strong:text-foreground
        prose-code:text-orange-300 prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-pre:bg-muted prose-pre:border prose-pre:border-border
        prose-table:text-muted-foreground
        prose-th:text-foreground prose-th:border-border
        prose-td:border-border
        prose-li:text-muted-foreground
        prose-hr:border-border
        ${className ?? ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

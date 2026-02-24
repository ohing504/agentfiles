import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ShikiCodeBlock } from "@/components/ui/shiki-code-block"

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-sm max-w-none
        prose-headings:text-foreground prose-p:text-muted-foreground
        prose-a:text-primary prose-strong:text-foreground
        prose-code:text-orange-700 dark:prose-code:text-orange-300 prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-table:text-muted-foreground
        prose-th:text-foreground prose-th:border-border
        prose-td:border-border
        prose-li:text-muted-foreground
        prose-hr:border-border
        ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>
          },
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || "")
            const code = String(children).replace(/\n$/, "")
            if (match) {
              return <ShikiCodeBlock code={code} lang={match[1]} lineNumbers={false} />
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

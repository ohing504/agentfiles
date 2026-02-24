import { CodeXml, Copy, Eye } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import {
  detectLangFromPath,
  ShikiCodeBlock,
} from "@/components/ui/shiki-code-block"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { m } from "@/paraglide/messages"

export function FileViewer({
  content,
  rawContent,
  fileName,
  lang: langProp,
  isMarkdown = true,
  isLoading,
  header,
  lineNumbers,
  className,
}: {
  /** Body to render in preview mode (markdown-rendered). Falls back to rawContent if omitted. */
  content?: string
  /** Full raw source for source view & copy. */
  rawContent: string
  /** File name for syntax highlighting language detection (e.g. "helper.ts"). */
  fileName?: string
  /** Override language for syntax highlighting (e.g. "bash", "typescript"). */
  lang?: string
  /** Whether to show preview/source toggle. Defaults to true. */
  isMarkdown?: boolean
  isLoading?: boolean
  /** Optional node rendered above content in preview mode (e.g. FrontmatterBadges). */
  header?: ReactNode
  /** Whether to show line numbers in source view. Defaults to !isMarkdown. */
  lineNumbers?: boolean
  /** Additional CSS classes for the outer container. */
  className?: string
}) {
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview")
  const previewContent = content ?? rawContent

  const showPreview = isMarkdown && viewMode === "preview"
  const lang =
    langProp ?? (fileName ? detectLangFromPath(fileName) : "markdown")
  const showLineNumbers = lineNumbers ?? !isMarkdown

  return (
    <section
      className={`rounded-lg border bg-muted/30 overflow-hidden flex flex-col min-h-0 ${className ?? ""}`}
    >
      <div className="flex items-center justify-end gap-1 px-2 h-11">
        {isMarkdown && (
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "preview" | "source")}
          >
            <TabsList className="h-7">
              <TabsTrigger value="preview" className="aspect-square p-0">
                <Eye className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger value="source" className="aspect-square p-0">
                <CodeXml className="size-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            navigator.clipboard.writeText(rawContent)
            toast.success(m.skills_copied())
          }}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>

      <div className="px-4 pb-4 flex-1 overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : showPreview ? (
          <>
            {header}
            {previewContent && <MarkdownPreview content={previewContent} />}
          </>
        ) : (
          <ShikiCodeBlock
            code={rawContent}
            lang={lang}
            embedded
            lineNumbers={showLineNumbers}
            className="[&_pre]:whitespace-pre-wrap [&_pre]:break-all"
          />
        )}
      </div>
    </section>
  )
}

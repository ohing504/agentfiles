import { ExternalLinkIcon } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { useFileTreeQuery } from "../api/files.queries"
import { useFilesSelection } from "../context/FilesContext"
import { FilesScopeTabs } from "./FilesScopeTabs"
import { FileTreeNode } from "./FileTree"
import { FileViewerPanel } from "./FileViewerPanel"

export function FilesPageContent() {
  const { activeProjectPath } = useProjectContext()
  const { scope, setScope, selectedPath, setSelectedPath } = useFilesSelection()
  const { data: tree, isLoading } = useFileTreeQuery(scope)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold">{m.files_title()}</h2>
        <a
          href={m.files_docs_url()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {m.common_docs()}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>

      {/* Scope tabs */}
      <div className="shrink-0 px-4 pb-2">
        <FilesScopeTabs
          scope={scope}
          onScopeChange={setScope}
          hasProject={!!activeProjectPath}
        />
      </div>

      {/* Tree + Viewer */}
      <div className="flex flex-1 min-h-0">
        {/* Left: File tree */}
        <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&_li]:list-none">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : tree?.children?.length ? (
              tree.children.map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                {m.files_empty_dir()}
              </div>
            )}
          </div>
        </div>

        {/* Right: File viewer */}
        <FileViewerPanel filePath={selectedPath} />
      </div>
    </div>
  )
}

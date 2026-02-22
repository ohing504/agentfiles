import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  HardDrive,
  Save,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useClaudeMdFiles } from "@/hooks/use-claude-md-files"
import { m } from "@/paraglide/messages"

export const Route = createFileRoute("/claude-md")({ component: ClaudeMdPage })

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

// Unified editor for any CLAUDE.md file
function ClaudeMdEditor({
  fileId,
}: {
  fileId: { global: true } | { projectPath: string; relativePath: string }
}) {
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileMeta, setFileMeta] = useState<{
    path: string
    size: number
    lastModified: string
  } | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    import("@/server/claude-md")
      .then(({ readClaudeMdFileFn }) =>
        readClaudeMdFileFn({
          data:
            "global" in fileId
              ? { global: true }
              : {
                  projectPath: fileId.projectPath,
                  relativePath: fileId.relativePath,
                },
        }),
      )
      .then((result) => {
        setContent(result.content)
        setOriginalContent(result.content)
        setFileMeta({
          path: result.path,
          size: result.size,
          lastModified: result.lastModified,
        })
        setIsDirty(false)
        setIsLoading(false)
      })
      .catch(() => {
        setError("Failed to load CLAUDE.md")
        setIsLoading(false)
      })
  }, [fileId])

  const handleChange = (value: string) => {
    setContent(value)
    setIsDirty(value !== originalContent)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { saveClaudeMdFileFn } = await import("@/server/claude-md")
      await saveClaudeMdFileFn({
        data:
          "global" in fileId
            ? { global: true, content }
            : {
                projectPath: fileId.projectPath,
                relativePath: fileId.relativePath,
                content,
              },
      })
      setOriginalContent(content)
      setIsDirty(false)
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm py-8">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fileMeta?.lastModified && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-mono truncate max-w-xs">{fileMeta.path}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{formatFileSize(fileMeta.size)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(fileMeta.lastModified)}</span>
          </div>
        </div>
      )}

      {!fileMeta?.lastModified && (
        <p className="text-sm text-muted-foreground">
          No file found. Start typing to create one.
        </p>
      )}

      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="# CLAUDE.md\n\nAdd instructions for Claude here..."
        className="font-mono text-sm min-h-[400px] resize-y"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : ""}
        </span>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          size="sm"
          className="gap-1.5"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}

// Shared file tree item component
function ClaudeMdItem({
  label,
  size,
  selected,
  onClick,
}: {
  label: string
  size?: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="w-full justify-start gap-2"
    >
      <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="font-mono text-xs truncate">{label}</span>
      {size != null && (
        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
          {formatFileSize(size)}
        </span>
      )}
    </Button>
  )
}

// "global" for ~/.claude/CLAUDE.md, or a relative path for project files
type SelectedFile = "global" | string

function useGlobalFileMeta() {
  return useQuery({
    queryKey: ["claude-md-global-meta"],
    queryFn: async () => {
      const { readClaudeMdFileFn } = await import("@/server/claude-md")
      const result = await readClaudeMdFileFn({ data: { global: true } })
      return result.size
    },
  })
}

function ClaudeMdPage() {
  const { activeProject, activeProjectPath } = useProjectContext()
  const { data: projectFiles, isLoading: filesLoading } = useClaudeMdFiles()
  const { data: globalSize } = useGlobalFileMeta()
  const [selected, setSelected] = useState<SelectedFile>("global")

  const editorKey =
    selected === "global" ? "global" : `${activeProjectPath}/${selected}`

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{m.nav_claude_md()}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: File tree */}
        <div className="space-y-2">
          {/* Global */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium [&[data-state=open]>svg:first-child]:rotate-90">
              <ChevronRight className="size-4 transition-transform" />
              <Globe className="size-4" />
              <span>Global</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6">
              <ClaudeMdItem
                label="~/.claude/CLAUDE.md"
                size={globalSize}
                selected={selected === "global"}
                onClick={() => setSelected("global")}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Project — all CLAUDE.md files from recursive scan */}
          {activeProject && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium [&[data-state=open]>svg:first-child]:rotate-90">
                <ChevronRight className="size-4 transition-transform" />
                <FolderOpen className="size-4" />
                <span className="truncate">{activeProject.name}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6">
                {filesLoading ? (
                  <div className="space-y-2 py-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ) : !projectFiles || projectFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No CLAUDE.md files found.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {projectFiles.map((file) => (
                      <ClaudeMdItem
                        key={file.relativePath}
                        label={file.relativePath}
                        size={file.size}
                        selected={selected === file.relativePath}
                        onClick={() => setSelected(file.relativePath)}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right: Editor */}
        <div>
          <div className="mb-4">
            <span className="font-mono text-xs text-muted-foreground">
              {selected === "global" ? "~/.claude/CLAUDE.md" : selected}
            </span>
          </div>
          <ClaudeMdEditor
            key={editorKey}
            fileId={
              selected === "global"
                ? { global: true }
                : {
                    projectPath: activeProjectPath ?? "",
                    relativePath: selected,
                  }
            }
          />
        </div>
      </div>
    </div>
  )
}

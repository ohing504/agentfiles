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
import { ScopeBadge } from "@/components/ScopeBadge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useClaudeMdFiles } from "@/hooks/use-claude-md-files"
import { useClaudeMd } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { Scope } from "@/shared/types"

export const Route = createFileRoute("/claude-md")({ component: ClaudeMdPage })

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function ClaudeMdEditor({ scope }: { scope: Scope }) {
  const { query, mutation } = useClaudeMd(scope)
  const [content, setContent] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  const data = query.data

  useEffect(() => {
    if (data) {
      setContent(data.content)
      setIsDirty(false)
    }
  }, [data])

  const handleChange = (value: string) => {
    setContent(value)
    setIsDirty(value !== (data?.content ?? ""))
  }

  const handleSave = () => {
    mutation.mutate(content, {
      onSuccess: () => {
        setIsDirty(false)
      },
    })
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm py-8">
        <AlertCircle className="w-4 h-4" />
        <span>Failed to load CLAUDE.md</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-mono truncate max-w-xs">{data.path}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{formatFileSize(data.size)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(data.lastModified)}</span>
          </div>
        </div>
      )}

      {!data && (
        <p className="text-sm text-muted-foreground">
          No CLAUDE.md file found for this scope. Start typing to create one.
        </p>
      )}

      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`# CLAUDE.md (${scope})\n\nAdd instructions for Claude here...`}
        className="font-mono text-sm min-h-[400px] resize-y"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : ""}
        </span>
        <Button
          onClick={handleSave}
          disabled={!isDirty || mutation.isPending}
          size="sm"
          className="gap-1.5"
        >
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {mutation.isError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to save. Please try again.</span>
        </div>
      )}
    </div>
  )
}

function ProjectClaudeMdFiles() {
  const { activeProject } = useProjectContext()
  const { data: files, isLoading } = useClaudeMdFiles()

  if (!activeProject) return null

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No CLAUDE.md files found in this project.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div
          key={file.relativePath}
          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs truncate">
              {file.relativePath}
            </span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {formatFileSize(file.size)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ClaudeMdPage() {
  const { activeProject } = useProjectContext()
  const [selectedScope, setSelectedScope] = useState<Scope>("global")

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{m.nav_claude_md()}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: File tree */}
        <div className="space-y-2">
          {/* Global section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium [&[data-state=open]>svg:first-child]:rotate-90">
              <ChevronRight className="size-4 transition-transform" />
              <Globe className="size-4" />
              <span>Global</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6">
              <button
                type="button"
                onClick={() => setSelectedScope("global")}
                className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-md text-sm ${
                  selectedScope === "global"
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs">~/.claude/CLAUDE.md</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Project section */}
          {activeProject && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium [&[data-state=open]>svg:first-child]:rotate-90">
                <ChevronRight className="size-4 transition-transform" />
                <FolderOpen className="size-4" />
                <span className="truncate">{activeProject.name}</span>
                <ScopeBadge scope="project" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6">
                <button
                  type="button"
                  onClick={() => setSelectedScope("project")}
                  className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-md text-sm ${
                    selectedScope === "project"
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-xs">.claude/CLAUDE.md</span>
                </button>
                <ProjectClaudeMdFiles />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right: Editor */}
        <div>
          <div className="mb-4">
            <ScopeBadge scope={selectedScope} />
          </div>
          <ClaudeMdEditor scope={selectedScope} />
        </div>
      </div>
    </div>
  )
}

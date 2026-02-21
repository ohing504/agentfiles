import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle, Clock, FileText, HardDrive, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
      {/* File metadata */}
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

      {/* Editor */}
      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`# CLAUDE.md (${scope})\n\nAdd instructions for Claude here...`}
        className="font-mono text-sm min-h-[400px] resize-y"
      />

      {/* Save button */}
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

function ClaudeMdPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{m.nav_claude_md()}</h1>
      </div>

      <Tabs defaultValue="global">
        <TabsList className="mb-4">
          <TabsTrigger value="global" className="gap-2">
            <ScopeBadge scope="global" />
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-2">
            <ScopeBadge scope="project" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <ClaudeMdEditor scope="global" />
        </TabsContent>

        <TabsContent value="project">
          <ClaudeMdEditor scope="project" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

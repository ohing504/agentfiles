import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  Bot,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  HardDrive,
  Save,
  Sparkles,
  Terminal,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useClaudeMdFiles } from "@/hooks/use-claude-md-files"
import {
  FREQUENT_REFETCH,
  useAgentFiles,
  useClaudeMdFile,
  useClaudeMdGlobalMeta,
} from "@/hooks/use-config"
import { formatDate, formatFileSize } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import { m } from "@/paraglide/messages"
import type { AgentFile, ClaudeMdFileId, Scope } from "@/shared/types"

export const Route = createFileRoute("/files")({ component: FilesPage })

// ── Selected file state ────────────────────────────────────────────────────

type SelectedFile =
  | { kind: "claude-md"; fileId: ClaudeMdFileId }
  | {
      kind: "agent-file"
      agentType: AgentFile["type"]
      name: string
      scope: Scope
    }
  | null

// ── Tree item component ────────────────────────────────────────────────────

function TreeItem({
  label,
  size,
  selected,
  onClick,
  icon: Icon,
  isSymlink,
}: {
  label: string
  size?: number
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  isSymlink?: boolean
}) {
  return (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="w-full justify-start gap-2"
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="font-mono text-xs truncate">{label}</span>
      {isSymlink && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
          symlink
        </Badge>
      )}
      {size != null && (
        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
          {formatFileSize(size)}
        </span>
      )}
    </Button>
  )
}

// ── Sub-collapsible for agent/command/skill lists ─────────────────────────

function AgentSubSection({
  label,
  icon: Icon,
  files,
  selectedFile,
  onSelect,
}: {
  label: string
  icon: React.ElementType
  files: AgentFile[]
  selectedFile: SelectedFile
  onSelect: (file: SelectedFile) => void
}) {
  if (files.length === 0) return null

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full pl-2 pr-1 py-1 rounded-md hover:bg-muted/50 text-xs font-medium text-muted-foreground [&[data-state=open]>svg:first-child]:rotate-90">
        <ChevronRight className="size-3 transition-transform shrink-0" />
        <Icon className="size-3 shrink-0" />
        <span>{label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4">
        <div className="space-y-0.5">
          {files.map((file) => {
            const displayName = file.namespace
              ? `${file.namespace}/${file.name}`
              : file.name
            const isSelected =
              selectedFile?.kind === "agent-file" &&
              selectedFile.agentType === file.type &&
              selectedFile.name === file.name &&
              selectedFile.scope === file.scope
            return (
              <TreeItem
                key={`${file.scope}-${displayName}`}
                label={displayName}
                size={file.size}
                selected={isSelected}
                onClick={() =>
                  onSelect({
                    kind: "agent-file",
                    agentType: file.type,
                    name: file.name,
                    scope: file.scope,
                  })
                }
                icon={Icon}
                isSymlink={file.isSymlink}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── CLAUDE.md editor ──────────────────────────────────────────────────────

function ClaudeMdFileEditor({ fileId }: { fileId: ClaudeMdFileId }) {
  const [content, setContent] = useState("")
  const [savedContent, setSavedContent] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const contentRef = useRef("")
  const savedContentRef = useRef("")
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    query: { data, isLoading, error },
    mutation,
  } = useClaudeMdFile(fileId)

  contentRef.current = content
  savedContentRef.current = savedContent

  useEffect(() => {
    if (data === undefined) return
    if (contentRef.current === savedContentRef.current) {
      setContent(data.content)
      setSavedContent(data.content)
    }
  }, [data])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const isDirty = content !== savedContent

  const handleSave = () => {
    mutation.mutate(content, {
      onSuccess: () => {
        setSavedContent(content)
        setShowSaved(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
      },
    })
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
        <span>{m.editor_load_error()}</span>
      </div>
    )
  }

  return (
    <EditorShell
      path={data?.path}
      size={data?.size}
      lastModified={data?.lastModified}
      content={content}
      onChange={setContent}
      onSave={handleSave}
      isSaving={mutation.isPending}
      isSaveError={mutation.isError}
      isDirty={isDirty}
      showSaved={showSaved}
    />
  )
}

// ── Agent/command/skill editor ────────────────────────────────────────────

function AgentFileEditor({
  agentType,
  name,
  scope,
}: {
  agentType: AgentFile["type"]
  name: string
  scope: Scope
}) {
  const { activeProjectPath } = useProjectContext()
  const queryClient = useQueryClient()
  const [content, setContent] = useState("")
  const [savedContent, setSavedContent] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const contentRef = useRef("")
  const savedContentRef = useRef("")
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = useQuery({
    queryKey: ["agent-file-content", agentType, name, scope, activeProjectPath],
    queryFn: async () => {
      const { getItemFn } = await import("@/server/items")
      return getItemFn({
        data: { type: agentType, name, scope, projectPath: activeProjectPath },
      })
    },
    ...FREQUENT_REFETCH,
  })

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const { saveItemFn } = await import("@/server/items")
      return saveItemFn({
        data: {
          type: agentType,
          name,
          content: newContent,
          scope,
          projectPath: activeProjectPath,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-file-content", agentType, name, scope],
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.overview.all })
    },
  })

  contentRef.current = content
  savedContentRef.current = savedContent

  useEffect(() => {
    if (query.data === undefined) return
    if (contentRef.current === savedContentRef.current) {
      setContent(query.data.content)
      setSavedContent(query.data.content)
    }
  }, [query.data])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const isDirty = content !== savedContent

  const handleSave = () => {
    mutation.mutate(content, {
      onSuccess: () => {
        setSavedContent(content)
        setShowSaved(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
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

  if (query.error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm py-8">
        <AlertCircle className="w-4 h-4" />
        <span>{m.editor_load_error()}</span>
      </div>
    )
  }

  const data = query.data
  const dataSize = data && "size" in data ? data.size : undefined
  const dataLastModified =
    data && "lastModified" in data ? data.lastModified : undefined

  return (
    <EditorShell
      path={data?.path}
      size={dataSize}
      lastModified={dataLastModified}
      content={content}
      onChange={setContent}
      onSave={handleSave}
      isSaving={mutation.isPending}
      isSaveError={mutation.isError}
      isDirty={isDirty}
      showSaved={showSaved}
    />
  )
}

// ── Shared editor shell ────────────────────────────────────────────────────

function EditorShell({
  path,
  size,
  lastModified,
  content,
  onChange,
  onSave,
  isSaving,
  isSaveError,
  isDirty,
  showSaved,
}: {
  path?: string
  size?: number
  lastModified?: string
  content: string
  onChange: (v: string) => void
  onSave: () => void
  isSaving: boolean
  isSaveError: boolean
  isDirty: boolean
  showSaved: boolean
}) {
  return (
    <div className="space-y-4">
      {lastModified && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {path && (
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-mono truncate max-w-xs">{path}</span>
            </div>
          )}
          {size != null && (
            <div className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{formatFileSize(size)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(lastModified)}</span>
          </div>
        </div>
      )}

      {!lastModified && (
        <p className="text-sm text-muted-foreground">{m.editor_no_file()}</p>
      )}

      {isSaveError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{m.editor_save_error()}</span>
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault()
            if (isDirty && !isSaving) onSave()
          }
        }}
        placeholder={m.editor_placeholder()}
        className="font-mono text-sm min-h-[400px] resize-y"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {showSaved ? (
            <span className="text-green-600 dark:text-green-400">
              {m.editor_saved()}
            </span>
          ) : isDirty ? (
            m.editor_unsaved_changes()
          ) : (
            ""
          )}
        </span>
        <Button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          size="sm"
          className="gap-1.5"
        >
          <Save className="w-4 h-4" />
          {isSaving ? m.editor_saving() : m.editor_save()}
        </Button>
      </div>
    </div>
  )
}

// ── File editor dispatcher ─────────────────────────────────────────────────

function FileEditor({ selectedFile }: { selectedFile: SelectedFile }) {
  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm">{m.files_select_file()}</p>
      </div>
    )
  }

  if (selectedFile.kind === "claude-md") {
    return (
      <ClaudeMdFileEditor
        key={
          "global" in selectedFile.fileId
            ? "global"
            : `${selectedFile.fileId.projectPath}/${selectedFile.fileId.relativePath}`
        }
        fileId={selectedFile.fileId}
      />
    )
  }

  // agent-file
  return (
    <AgentFileEditor
      key={`${selectedFile.agentType}-${selectedFile.scope}-${selectedFile.name}`}
      agentType={selectedFile.agentType}
      name={selectedFile.name}
      scope={selectedFile.scope}
    />
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

function FilesPage() {
  const { activeProject, activeProjectPath } = useProjectContext()
  const { data: globalSize } = useClaudeMdGlobalMeta()
  const { data: projectFiles, isLoading: projectFilesLoading } =
    useClaudeMdFiles()

  const { query: agentsQuery } = useAgentFiles("agent")
  const { query: commandsQuery } = useAgentFiles("command")
  const { query: skillsQuery } = useAgentFiles("skill")

  const [selectedFile, setSelectedFile] = useState<SelectedFile>(null)

  const allAgents = agentsQuery.data ?? []
  const allCommands = commandsQuery.data ?? []
  const allSkills = skillsQuery.data ?? []

  const globalAgents = allAgents.filter((f) => f.scope === "global")
  const globalCommands = allCommands.filter((f) => f.scope === "global")
  const globalSkills = allSkills.filter((f) => f.scope === "global")

  const projectAgents = allAgents.filter((f) => f.scope === "project")
  const projectCommands = allCommands.filter((f) => f.scope === "project")
  const projectSkills = allSkills.filter((f) => f.scope === "project")

  const hasProject = !!activeProject

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{m.nav_files()}</h1>
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
            <CollapsibleContent className="pl-6 space-y-0.5">
              {/* Global CLAUDE.md */}
              <TreeItem
                label="~/.claude/CLAUDE.md"
                size={globalSize}
                selected={
                  selectedFile?.kind === "claude-md" &&
                  "global" in selectedFile.fileId
                }
                onClick={() =>
                  setSelectedFile({
                    kind: "claude-md",
                    fileId: { global: true },
                  })
                }
                icon={FileText}
              />

              {/* Global agent files */}
              <AgentSubSection
                label="agents/"
                icon={Bot}
                files={globalAgents}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
              <AgentSubSection
                label="commands/"
                icon={Terminal}
                files={globalCommands}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
              <AgentSubSection
                label="skills/"
                icon={Sparkles}
                files={globalSkills}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Project section */}
          {hasProject && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium [&[data-state=open]>svg:first-child]:rotate-90">
                <ChevronRight className="size-4 transition-transform" />
                <FolderOpen className="size-4" />
                <span className="truncate">{activeProject.name}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-0.5">
                {/* Project CLAUDE.md files */}
                {projectFilesLoading ? (
                  <div className="space-y-2 py-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ) : projectFiles && projectFiles.length > 0 ? (
                  <div className="space-y-0.5">
                    {projectFiles.map((file) => (
                      <TreeItem
                        key={file.relativePath}
                        label={file.relativePath}
                        size={file.size}
                        selected={
                          selectedFile?.kind === "claude-md" &&
                          "projectPath" in selectedFile.fileId &&
                          selectedFile.fileId.relativePath === file.relativePath
                        }
                        onClick={() =>
                          setSelectedFile({
                            kind: "claude-md",
                            fileId: {
                              projectPath: activeProjectPath ?? "",
                              relativePath: file.relativePath,
                            },
                          })
                        }
                        icon={FileText}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Project agent files */}
                <AgentSubSection
                  label="agents/"
                  icon={Bot}
                  files={projectAgents}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                />
                <AgentSubSection
                  label="commands/"
                  icon={Terminal}
                  files={projectCommands}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                />
                <AgentSubSection
                  label="skills/"
                  icon={Sparkles}
                  files={projectSkills}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right: Editor */}
        <div>
          <FileEditor selectedFile={selectedFile} />
        </div>
      </div>
    </div>
  )
}

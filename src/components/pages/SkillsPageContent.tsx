import { useForm, useStore } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Info,
  Plus,
  ScrollText,
  Search,
  SquareTerminal,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { FileViewer } from "@/components/FileViewer"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import { useProjectContext } from "@/components/ProjectContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useAgentFiles } from "@/hooks/use-config"
import { formatDate } from "@/lib/format"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1].trim() : content
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const addSkillSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Name must be 64 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().min(1, "Description is required"),
})

// ── FrontmatterBadges ─────────────────────────────────────────────────────────

function FrontmatterBadges({
  frontmatter,
}: {
  frontmatter: AgentFile["frontmatter"]
}) {
  if (!frontmatter) return null

  const entries: { label: string; value: string }[] = []
  if (frontmatter.model)
    entries.push({ label: "model", value: String(frontmatter.model) })
  if (frontmatter.context)
    entries.push({ label: "context", value: String(frontmatter.context) })
  if (frontmatter.agent)
    entries.push({ label: "agent", value: String(frontmatter.agent) })
  if (frontmatter["allowed-tools"])
    entries.push({
      label: "allowed-tools",
      value: String(frontmatter["allowed-tools"]),
    })
  if (frontmatter["argument-hint"])
    entries.push({
      label: "argument-hint",
      value: String(frontmatter["argument-hint"]),
    })
  if (frontmatter["disable-model-invocation"])
    entries.push({ label: "disable-model-invocation", value: "true" })
  if (frontmatter["user-invocable"] === false)
    entries.push({ label: "user-invocable", value: "false" })

  if (entries.length === 0) return null

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {entries.map((e) => {
          const values = e.value.includes(",")
            ? e.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
            : [e.value]
          return (
            <div key={e.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{e.label}</span>
              <div className="flex flex-wrap gap-1">
                {values.map((v) => (
                  <Badge key={v} variant="secondary">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <Separator className="mt-3" />
    </div>
  )
}

// ── SkillDetailPanel ──────────────────────────────────────────────────────────

function SkillDetailPanel({
  skill,
  activeProjectPath,
  onDeleted,
}: {
  skill: AgentFile
  activeProjectPath: string | null | undefined
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState(false)

  // Load full content
  const { data: itemDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["skill-detail", skill.path],
    queryFn: async () => {
      if (!skill) return null
      const { getItemFn } = await import("@/server/items")
      return getItemFn({
        data: {
          type: skill.type,
          name: skill.name,
          scope: skill.scope,
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    enabled: !!skill,
  })

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  async function handleOpenInEditor(editor: "code" | "cursor") {
    try {
      const { openInEditorFn } = await import("@/server/skills")
      await openInEditorFn({ data: { filePath: skill.path, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  async function handleOpenFolder() {
    try {
      const { openFolderFn } = await import("@/server/skills")
      const dirPath = skill.path.replace(/\/SKILL\.md$/, "")
      await openFolderFn({ data: { dirPath } })
    } catch {
      toast.error("Failed to open folder")
    }
  }

  async function handleDelete() {
    try {
      const { deleteItemFn } = await import("@/server/items")
      await deleteItemFn({
        data: {
          type: skill.type,
          name: skill.name,
          scope: skill.scope,
          projectPath: activeProjectPath ?? undefined,
        },
      })
      toast.success("Skill deleted")
      await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
      onDeleted()
    } catch {
      toast.error("Failed to delete skill")
    }
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold truncate min-w-0">{skill.name}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              {m.skills_edit()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              <VscodeIcon className="size-4" />
              {m.skills_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              <CursorIcon className="size-4" />
              {m.skills_open_cursor()}
            </DropdownMenuItem>
            {skill.isSkillDir && (
              <DropdownMenuItem onClick={handleOpenFolder}>
                <FolderOpen className="size-4" />
                {m.skills_open_folder()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(true)}
            >
              {m.skills_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0">
        {/* Meta info */}
        <section className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {m.skills_scope()}
              </dt>
              <dd className="text-sm font-medium capitalize">{skill.scope}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {m.skills_last_updated()}
              </dt>
              <dd className="text-sm font-medium">
                {formatDate(skill.lastModified, getLocale())}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">
              {m.skills_description()}
            </dt>
            <dd className="text-sm text-foreground">
              {skill.frontmatter?.description ? (
                String(skill.frontmatter.description)
              ) : (
                <span className="italic text-muted-foreground">
                  No description
                </span>
              )}
            </dd>
          </div>
        </section>

        <Separator />

        {/* Markdown card */}
        <FileViewer
          content={body}
          rawContent={itemDetail?.content ?? ""}
          fileName="SKILL.md"
          isLoading={detailLoading}
          header={<FrontmatterBadges frontmatter={skill.frontmatter} />}
          className="flex-1"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.skills_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.skills_delete_confirm({ name: skill.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingDelete(false)
                handleDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── SkillsScopeSection ────────────────────────────────────────────────────────

function SkillsScopeSection({
  label,
  scope,
  allFiles,
  searchQuery,
  selectedSkill,
  selectedSupportingFile,
  expandedSkillPath,
  onSelectSkill,
  onSelectSupportingFile,
  onExpandSkill,
  onAddClick,
}: {
  label: string
  scope: Scope
  allFiles: AgentFile[]
  searchQuery: string
  selectedSkill: AgentFile | null
  selectedSupportingFile: SupportingFile | null
  expandedSkillPath: string | null
  onSelectSkill: (skill: AgentFile) => void
  onSelectSupportingFile: (sf: SupportingFile | null) => void
  onExpandSkill: (path: string | null) => void
  onAddClick: () => void
}) {
  const scopeFiles = allFiles.filter((f) => f.scope === scope)
  const skills = scopeFiles.filter((f) => f.type === "skill")
  const commands = scopeFiles.filter((f) => f.type === "command")

  const q = searchQuery.toLowerCase()
  const filteredSkills = q
    ? skills.filter((f) => f.name.toLowerCase().includes(q))
    : skills
  const filteredCommands = q
    ? commands.filter((f) => f.name.toLowerCase().includes(q))
    : commands

  // Group commands by namespace
  const namespacedCommands = new Map<string, AgentFile[]>()
  const flatCommands: AgentFile[] = []
  for (const cmd of filteredCommands) {
    if (cmd.namespace) {
      const existing = namespacedCommands.get(cmd.namespace)
      if (existing) {
        existing.push(cmd)
      } else {
        namespacedCommands.set(cmd.namespace, [cmd])
      }
    } else {
      flatCommands.push(cmd)
    }
  }
  // Sort items within each namespace folder
  for (const cmds of namespacedCommands.values()) {
    cmds.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Track skill names for duplicate detection (command with same name → muted)
  const skillNames = new Set(filteredSkills.map((f) => f.name))

  const duplicateTooltip = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="size-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">{m.skills_duplicate_tooltip()}</p>
      </TooltipContent>
    </Tooltip>
  )

  // Build unified sorted tree items
  type TreeItem =
    | { kind: "skill"; file: AgentFile; sortKey: string }
    | { kind: "command"; file: AgentFile; sortKey: string }
    | {
        kind: "namespace"
        name: string
        commands: AgentFile[]
        sortKey: string
      }
  const treeItems: TreeItem[] = [
    ...filteredSkills.map((f) => ({
      kind: "skill" as const,
      file: f,
      sortKey: f.name,
    })),
    ...flatCommands.map((f) => ({
      kind: "command" as const,
      file: f,
      sortKey: f.name,
    })),
    ...[...namespacedCommands.entries()].map(([ns, cmds]) => ({
      kind: "namespace" as const,
      name: ns,
      commands: cmds,
      sortKey: ns,
    })),
  ].sort((a, b) => {
    const cmp = a.sortKey.localeCompare(b.sortKey)
    if (cmp !== 0) return cmp
    // Same name: skills first, then namespace folders, then commands
    const kindOrder = { skill: 0, namespace: 1, command: 2 }
    return kindOrder[a.kind] - kindOrder[b.kind]
  })

  const hasAny = filteredSkills.length > 0 || filteredCommands.length > 0
  const hasOriginal = skills.length > 0 || commands.length > 0

  return (
    <div>
      <div className="flex items-center justify-between h-8 px-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center justify-center rounded p-0.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          aria-label={`Add skill to ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {!hasOriginal ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">
          No skills configured
        </p>
      ) : !hasAny ? (
        <p className="text-xs text-muted-foreground px-2 py-1.5">No results</p>
      ) : (
        <Tree>
          {treeItems.map((item) => {
            if (item.kind === "skill") {
              const hasSupportingFiles =
                item.file.isSkillDir &&
                item.file.supportingFiles &&
                item.file.supportingFiles.length > 0

              if (hasSupportingFiles) {
                const isExpanded = expandedSkillPath === item.file.path
                return (
                  <TreeFolder
                    key={item.file.path}
                    icon={ScrollText}
                    label={item.file.name}
                    selected={
                      selectedSkill?.path === item.file.path &&
                      !selectedSupportingFile
                    }
                    open={isExpanded}
                    onOpenChange={(o) =>
                      onExpandSkill(o ? item.file.path : null)
                    }
                    onClick={() => {
                      onSelectSkill(item.file)
                      onSelectSupportingFile(null)
                      onExpandSkill(item.file.path)
                    }}
                    hideChevron
                  >
                    <TreeFile
                      icon={FileText}
                      label="SKILL.md"
                      selected={
                        selectedSkill?.path === item.file.path &&
                        selectedSupportingFile?.relativePath === "SKILL.md"
                      }
                      onClick={() => {
                        onSelectSkill(item.file)
                        onSelectSupportingFile({
                          name: "SKILL.md",
                          relativePath: "SKILL.md",
                          size: item.file.size,
                        })
                      }}
                    />
                    {item.file.supportingFiles?.map((sf) => (
                      <TreeFile
                        key={sf.relativePath}
                        icon={FileText}
                        label={sf.relativePath}
                        selected={
                          selectedSkill?.path === item.file.path &&
                          selectedSupportingFile?.relativePath ===
                            sf.relativePath
                        }
                        onClick={() => {
                          onSelectSkill(item.file)
                          onSelectSupportingFile(sf)
                        }}
                      />
                    ))}
                  </TreeFolder>
                )
              }

              return (
                <TreeFile
                  key={item.file.path}
                  icon={ScrollText}
                  label={item.file.name}
                  selected={
                    selectedSkill?.path === item.file.path &&
                    !selectedSupportingFile
                  }
                  onClick={() => {
                    onSelectSkill(item.file)
                    onSelectSupportingFile(null)
                  }}
                />
              )
            }
            if (item.kind === "namespace") {
              return (
                <TreeFolder
                  key={item.name}
                  icon={FolderOpen}
                  label={`${item.name}/`}
                  count={item.commands.length}
                  defaultOpen
                >
                  {item.commands.map((f) => {
                    const isDup = skillNames.has(f.name)
                    return (
                      <TreeFile
                        key={f.path}
                        icon={SquareTerminal}
                        label={f.name}
                        muted={isDup}
                        trailing={isDup ? duplicateTooltip : undefined}
                        selected={selectedSkill?.path === f.path}
                        onClick={() => onSelectSkill(f)}
                      />
                    )
                  })}
                </TreeFolder>
              )
            }
            const isDup = skillNames.has(item.file.name)
            return (
              <TreeFile
                key={item.file.path}
                icon={SquareTerminal}
                label={item.file.name}
                muted={isDup}
                trailing={isDup ? duplicateTooltip : undefined}
                selected={selectedSkill?.path === item.file.path}
                onClick={() => onSelectSkill(item.file)}
              />
            )
          })}
        </Tree>
      )}
    </div>
  )
}

// ── AddSkillDialog ────────────────────────────────────────────────────────────

function AddSkillDialog({
  scope,
  activeProjectPath,
  onClose,
}: {
  scope: Scope
  activeProjectPath: string | null | undefined
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    validators: {
      onSubmit: addSkillSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const { createSkillFn } = await import("@/server/skills")
        await createSkillFn({
          data: {
            name: value.name,
            scope,
            description: value.description || undefined,
            projectPath: activeProjectPath ?? undefined,
          },
        })
        toast.success(`Skill '${value.name}' created`)
        await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
        onClose()
      } catch {
        toast.error("Failed to create skill")
      }
    },
  })

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
          <DialogDescription>
            Creates a new skill directory with SKILL.md template in{" "}
            {scope === "global" ? "~/.claude/skills/" : ".claude/skills/"}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup className="py-2">
            {/* Name field */}
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="my-skill"
                      className="text-sm"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    <FieldDescription>
                      Lowercase letters, numbers, and hyphens only. Max 64
                      characters.
                    </FieldDescription>
                  </Field>
                )
              }}
            </form.Field>

            {/* Description field */}
            <form.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>
                      Description <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What does this skill do?"
                      className="text-sm"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── SupportingFilePanel ──────────────────────────────────────────────────────

function SupportingFilePanel({
  skill,
  supportingFile,
}: {
  skill: AgentFile
  supportingFile: SupportingFile
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["supporting-file", skill.path, supportingFile.relativePath],
    queryFn: async () => {
      const { readSupportingFileFn } = await import("@/server/skills")
      return readSupportingFileFn({
        data: {
          skillPath: skill.path,
          relativePath: supportingFile.relativePath,
        },
      })
    },
  })

  const isMarkdown = supportingFile.name.endsWith(".md")
  const rawContent = data?.content ?? ""
  const body = isMarkdown ? extractBody(rawContent) : rawContent

  return (
    <>
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <h2 className="text-sm font-semibold truncate min-w-0">
          {supportingFile.relativePath}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <FileViewer
          content={isMarkdown ? body : undefined}
          rawContent={rawContent}
          fileName={supportingFile.relativePath}
          isMarkdown={isMarkdown}
          isLoading={isLoading}
          className="flex-1"
        />
      </div>
    </>
  )
}

// ── SkillsPageContent ─────────────────────────────────────────────────────────

export function SkillsPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
  const [selectedSupportingFile, setSelectedSupportingFile] =
    useState<SupportingFile | null>(null)
  const [expandedSkillPath, setExpandedSkillPath] = useState<string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

  // When selecting a skill/command, auto-expand its folder (if it has one) and collapse others
  function handleSelectSkill(skill: AgentFile) {
    setSelectedSkill(skill)
    setSelectedSupportingFile(null)
    // Collapse expanded folder for non-folder items;
    // folder items handle expansion via their own onClick
    const hasSF =
      skill.isSkillDir &&
      skill.supportingFiles &&
      skill.supportingFiles.length > 0
    if (!hasSF) {
      setExpandedSkillPath(null)
    }
  }

  const { query } = useAgentFiles("skill")

  if (query.isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const allFiles: AgentFile[] = query.data ?? []

  function handleAddClick(scope: Scope) {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }

  return (
    <div className="flex h-full">
      {/* 좌측 패널 - 280px 트리 */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        {/* 좌측 헤더 */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">Skills</h2>
          <a
            href="https://docs.anthropic.com/en/docs/claude-code/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* 검색 + 트리 */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Global 스코프 섹션 */}
          <SkillsScopeSection
            label="Global"
            scope="global"
            allFiles={allFiles}
            searchQuery={searchQuery}
            selectedSkill={selectedSkill}
            selectedSupportingFile={selectedSupportingFile}
            expandedSkillPath={expandedSkillPath}
            onSelectSkill={handleSelectSkill}
            onSelectSupportingFile={setSelectedSupportingFile}
            onExpandSkill={setExpandedSkillPath}
            onAddClick={() => handleAddClick("global")}
          />

          {/* Project 스코프 섹션 (activeProjectPath 있을 때만) */}
          {activeProjectPath && (
            <SkillsScopeSection
              label="Project"
              scope="project"
              allFiles={allFiles}
              searchQuery={searchQuery}
              selectedSkill={selectedSkill}
              selectedSupportingFile={selectedSupportingFile}
              expandedSkillPath={expandedSkillPath}
              onSelectSkill={handleSelectSkill}
              onSelectSupportingFile={setSelectedSupportingFile}
              onExpandSkill={setExpandedSkillPath}
              onAddClick={() => handleAddClick("project")}
            />
          )}
        </div>
      </div>

      {/* 우측 패널 - 상세 또는 빈 상태 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSkill && selectedSupportingFile ? (
          <SupportingFilePanel
            key={selectedSupportingFile.relativePath}
            skill={selectedSkill}
            supportingFile={selectedSupportingFile}
          />
        ) : selectedSkill ? (
          <SkillDetailPanel
            key={selectedSkill.path}
            skill={selectedSkill}
            activeProjectPath={activeProjectPath}
            onDeleted={() => {
              setSelectedSkill(null)
              setSelectedSupportingFile(null)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollText />
                </EmptyMedia>
                <EmptyTitle>{m.skills_empty_title()}</EmptyTitle>
                <EmptyDescription>{m.skills_empty_desc()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Add Skill Dialog */}
      {addDialogOpen && (
        <AddSkillDialog
          scope={addDialogScope}
          activeProjectPath={activeProjectPath}
          onClose={() => setAddDialogOpen(false)}
        />
      )}
    </div>
  )
}

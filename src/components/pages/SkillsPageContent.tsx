import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Code,
  ExternalLink,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import { ScopeBadge } from "@/components/ScopeBadge"
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
import { Input } from "@/components/ui/input"
import { MarkdownPreview } from "@/components/ui/markdown-preview"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { useAgentFiles } from "@/hooks/use-config"
import { formatFileSize } from "@/lib/format"
import type { AgentFile, Scope } from "@/shared/types"

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1].trim() : content
}

// ── SkillFrontmatterForm ───────────────────────────────────────────────────────

interface SkillFrontmatterValues {
  description: string
  model: string
  context: string
  agent: string
  allowedTools: string
  argumentHint: string
  disableModelInvocation: boolean
  userInvocable: boolean
}

function initFormValues(
  frontmatter: AgentFile["frontmatter"],
): SkillFrontmatterValues {
  const fm = frontmatter ?? {}
  return {
    description: String(fm.description ?? ""),
    model: String(fm.model ?? ""),
    context: String(fm.context ?? ""),
    agent: String(fm.agent ?? ""),
    allowedTools: String(fm["allowed-tools"] ?? ""),
    argumentHint: String(fm["argument-hint"] ?? ""),
    disableModelInvocation: fm["disable-model-invocation"] === true,
    userInvocable: fm["user-invocable"] !== false,
  }
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
  const [isSaving, setIsSaving] = useState(false)

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

  // Local form state
  const [formValues, setFormValues] = useState<SkillFrontmatterValues>(() =>
    initFormValues(skill.frontmatter),
  )

  // Reset form when skill changes
  useEffect(() => {
    setFormValues(initFormValues(skill.frontmatter))
  }, [skill.frontmatter])

  const body = itemDetail?.content ? extractBody(itemDetail.content) : ""

  async function handleSave() {
    setIsSaving(true)
    try {
      const { saveFrontmatterFn } = await import("@/server/skills")

      // Build frontmatter object (omit empty/default values)
      const fm: Record<string, unknown> = {}
      if (formValues.description) fm.description = formValues.description
      if (formValues.model) fm.model = formValues.model
      if (formValues.context) fm.context = formValues.context
      if (formValues.agent) fm.agent = formValues.agent
      if (formValues.allowedTools) fm["allowed-tools"] = formValues.allowedTools
      if (formValues.argumentHint) fm["argument-hint"] = formValues.argumentHint
      if (formValues.disableModelInvocation)
        fm["disable-model-invocation"] = true
      if (!formValues.userInvocable) fm["user-invocable"] = false

      await saveFrontmatterFn({
        data: { filePath: skill.path, frontmatter: fm },
      })
      toast.success("Frontmatter saved")
      await queryClient.invalidateQueries({
        queryKey: ["skill-detail", skill.path],
      })
      await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
    } catch {
      toast.error("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

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

  function setField<K extends keyof SkillFrontmatterValues>(
    key: K,
    value: SkillFrontmatterValues[K],
  ) {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold truncate">{skill.name}</h2>
          <ScopeBadge scope={skill.scope} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              <Code className="size-4" />
              Open in VS Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              <Code className="size-4" />
              Open in Cursor
            </DropdownMenuItem>
            {skill.isSkillDir && (
              <DropdownMenuItem onClick={handleOpenFolder}>
                <FolderOpen className="size-4" />
                Open Folder
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 min-h-0">
        {/* 2a. Frontmatter GUI Form */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Frontmatter
          </h3>

          {/* description */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-description"
              className="text-xs font-medium text-foreground"
            >
              description
            </label>
            <Textarea
              id="fm-description"
              rows={2}
              value={formValues.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Describe what this skill does"
              className="text-sm resize-none"
            />
          </div>

          {/* model */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-model"
              className="text-xs font-medium text-foreground"
            >
              model
            </label>
            <Select
              value={formValues.model || "__none__"}
              onValueChange={(v) =>
                setField("model", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger id="fm-model" className="h-8 text-sm">
                <SelectValue placeholder="(none)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">(none)</SelectItem>
                <SelectItem value="sonnet">sonnet</SelectItem>
                <SelectItem value="haiku">haiku</SelectItem>
                <SelectItem value="opus">opus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* context */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-context"
              className="text-xs font-medium text-foreground"
            >
              context
            </label>
            <Select
              value={formValues.context || "__none__"}
              onValueChange={(v) =>
                setField("context", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger id="fm-context" className="h-8 text-sm">
                <SelectValue placeholder="(none)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">(none)</SelectItem>
                <SelectItem value="fork">fork</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* agent */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-agent"
              className="text-xs font-medium text-foreground"
            >
              agent
            </label>
            <Input
              id="fm-agent"
              value={formValues.agent}
              onChange={(e) => setField("agent", e.target.value)}
              placeholder="e.g. Explore, Plan, general-purpose"
              className="h-8 text-sm"
            />
          </div>

          {/* allowed-tools */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-allowed-tools"
              className="text-xs font-medium text-foreground"
            >
              allowed-tools
            </label>
            <Input
              id="fm-allowed-tools"
              value={formValues.allowedTools}
              onChange={(e) => setField("allowedTools", e.target.value)}
              placeholder="e.g. Read,Grep,Bash(git:*)"
              className="h-8 text-sm"
            />
          </div>

          {/* argument-hint */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-argument-hint"
              className="text-xs font-medium text-foreground"
            >
              argument-hint
            </label>
            <Input
              id="fm-argument-hint"
              value={formValues.argumentHint}
              onChange={(e) => setField("argumentHint", e.target.value)}
              placeholder="e.g. [issue-number]"
              className="h-8 text-sm"
            />
          </div>

          {/* disable-model-invocation */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="fm-disable-model"
                className="text-xs font-medium text-foreground"
              >
                disable-model-invocation
              </label>
              <p className="text-xs text-muted-foreground">
                Skip model call when running this skill
              </p>
            </div>
            <Switch
              id="fm-disable-model"
              checked={formValues.disableModelInvocation}
              onCheckedChange={(v) => setField("disableModelInvocation", v)}
            />
          </div>

          {/* user-invocable */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="fm-user-invocable"
                className="text-xs font-medium text-foreground"
              >
                user-invocable
              </label>
              <p className="text-xs text-muted-foreground">
                Allow users to invoke this skill directly
              </p>
            </div>
            <Switch
              id="fm-user-invocable"
              checked={formValues.userInvocable}
              onCheckedChange={(v) => setField("userInvocable", v)}
            />
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </section>

        <Separator />

        {/* 2b. Body Preview */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Body
          </h3>
          {detailLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : body ? (
            <MarkdownPreview content={body} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No body content
            </p>
          )}
        </section>

        {/* 2c. Supporting Files (only if isSkillDir && supportingFiles exist) */}
        {skill.isSkillDir &&
          skill.supportingFiles &&
          skill.supportingFiles.length > 0 && (
            <>
              <Separator />
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Supporting Files
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {skill.supportingFiles.map((sf) => (
                    <li
                      key={sf.relativePath}
                      className="flex items-center gap-2 text-sm"
                    >
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-foreground">
                        {sf.relativePath}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(sf.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

        {/* 2d. Action buttons row */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleOpenInEditor("code")}
          >
            <Code className="size-3.5" />
            Open in VS Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleOpenInEditor("cursor")}
          >
            <Code className="size-3.5" />
            Open in Cursor
          </Button>
          {skill.isSkillDir && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleOpenFolder}
            >
              <FolderOpen className="size-3.5" />
              Open Folder
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{skill.name}"? This action cannot
              be undone.
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
  onSelectSkill,
  onAddClick,
}: {
  label: string
  scope: Scope
  allFiles: AgentFile[]
  searchQuery: string
  selectedSkill: AgentFile | null
  onSelectSkill: (skill: AgentFile) => void
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
          {filteredSkills.length > 0 && (
            <TreeFolder
              icon={Sparkles}
              label="Skills"
              count={filteredSkills.length}
              defaultOpen
            >
              {filteredSkills.map((f) => (
                <TreeFile
                  key={f.path}
                  icon={f.isSkillDir ? FolderOpen : FileText}
                  label={f.name}
                  selected={selectedSkill?.path === f.path}
                  onClick={() => onSelectSkill(f)}
                />
              ))}
            </TreeFolder>
          )}
          {filteredCommands.length > 0 && (
            <TreeFolder
              icon={Terminal}
              label="Commands (legacy)"
              count={filteredCommands.length}
              defaultOpen
            >
              {filteredCommands.map((f) => (
                <TreeFile
                  key={f.path}
                  icon={FileText}
                  label={f.name}
                  selected={selectedSkill?.path === f.path}
                  onClick={() => onSelectSkill(f)}
                  trailing={
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      legacy
                    </Badge>
                  }
                />
              ))}
            </TreeFolder>
          )}
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
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const namePattern = /^[a-z0-9-]+$/

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!namePattern.test(name)) {
      setError("Only lowercase letters, numbers, and hyphens allowed")
      return
    }
    if (name.length > 64) {
      setError("Name must be 64 characters or less")
      return
    }

    setIsCreating(true)
    try {
      const { createSkillFn } = await import("@/server/skills")
      await createSkillFn({
        data: {
          name,
          scope,
          description: description || undefined,
          projectPath: activeProjectPath ?? undefined,
        },
      })
      toast.success(`Skill '${name}' created`)
      await queryClient.invalidateQueries({ queryKey: ["agent-files"] })
      onClose()
    } catch {
      toast.error("Failed to create skill")
    } finally {
      setIsCreating(false)
    }
  }

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
        <div className="flex flex-col gap-4 py-2">
          {/* Name field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="skill-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="skill-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              placeholder="my-skill"
              className="text-sm"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. Max 64 characters.
            </p>
          </div>
          {/* Description field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="skill-desc" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="skill-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do?"
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── SkillsPageContent ─────────────────────────────────────────────────────────

export function SkillsPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

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
            onSelectSkill={setSelectedSkill}
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
              onSelectSkill={setSelectedSkill}
              onAddClick={() => handleAddClick("project")}
            />
          )}
        </div>
      </div>

      {/* 우측 패널 - 상세 또는 빈 상태 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSkill ? (
          <SkillDetailPanel
            skill={selectedSkill}
            activeProjectPath={activeProjectPath}
            onDeleted={() => setSelectedSkill(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles />
                </EmptyMedia>
                <EmptyTitle>No Skill Selected</EmptyTitle>
                <EmptyDescription>
                  Select a skill from the left panel to view its details.
                </EmptyDescription>
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

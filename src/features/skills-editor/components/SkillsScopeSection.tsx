import {
  FileText,
  FolderOpen,
  Info,
  Plus,
  ScrollText,
  SquareTerminal,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tree, TreeFile, TreeFolder } from "@/components/ui/tree"
import { m } from "@/paraglide/messages"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"

export function SkillsScopeSection({
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

  // Track skill names for duplicate detection (command with same name -> muted)
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

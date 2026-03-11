// src/components/board/BoardLayout.tsx
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  BrainIcon,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Code,
  FileTextIcon,
  PlusIcon,
} from "lucide-react"
import type { ElementType } from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useProjectContext } from "@/components/ProjectContext"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  agentConfig,
  type HookItem,
  hookConfig,
  mcpConfig,
  memoryConfig,
  skillConfig,
} from "@/config/entities"
import { useAgentFiles, useMemoryFiles } from "@/hooks/use-config"
import { useHooksQuery } from "@/hooks/use-hooks"
import { useMcpMutations, useMcpQuery } from "@/hooks/use-mcp"
import { useTheme } from "@/hooks/use-theme"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { m } from "@/paraglide/messages"
import type {
  BoardColumnId,
  HookScope,
  HooksSettings,
  Scope,
} from "@/shared/types"
import { AddAgentDialog } from "./AddAgentDialog"
import { AddHookDialog } from "./AddHookDialog"
import { AddMcpDialog } from "./AddMcpDialog"
import { AddSkillDialog } from "./AddSkillDialog"
import { BoardColumnSettings } from "./BoardColumnSettings"
import { DetailPanelContent } from "./DetailPanelContent"
import { EntityListPanel } from "./EntityListPanel"
import { FilesPanel } from "./FilesPanel"
import { LspServersPanel } from "./LspServersPanel"
import { PluginsPanel } from "./PluginsPanel"
import type { DashboardDetailTarget } from "./types"
import { useBoardConfig } from "./use-board-config"
import { useEntityActionHandler } from "./use-entity-action-handler"

const COL_CLASS = "w-[280px] min-w-[280px] shrink-0"

/** HooksSettings를 flat HookItem[] 배열로 변환 */
function buildHookItems(hooks: HooksSettings, scope: HookScope): HookItem[] {
  const items: HookItem[] = []
  for (const [event, groups] of Object.entries(hooks)) {
    if (!groups) continue
    for (const group of groups) {
      for (const entry of group.hooks) {
        items.push({
          entry,
          event,
          matcher: group.matcher,
          scope,
        })
      }
    }
  }
  return items
}

/** Notion-inspired color palette for light/dark modes */
const NOTION_COLORS: Record<
  string,
  { dot: string; bg: string; darkDot: string; darkBg: string }
> = {
  blue: {
    dot: "#528bff",
    bg: "rgba(211,229,239,0.65)",
    darkDot: "#6b9cc4",
    darkBg: "rgba(40,69,108,0.35)",
  },
  purple: {
    dot: "#9a6dd7",
    bg: "rgba(232,222,238,0.65)",
    darkDot: "#b08de5",
    darkBg: "rgba(73,47,100,0.35)",
  },
  green: {
    dot: "#4dab9a",
    bg: "rgba(219,237,219,0.65)",
    darkDot: "#4dab9a",
    darkBg: "rgba(43,89,63,0.35)",
  },
  orange: {
    dot: "#d9730d",
    bg: "rgba(250,222,201,0.65)",
    darkDot: "#d9730d",
    darkBg: "rgba(133,76,29,0.35)",
  },
  yellow: {
    dot: "#cb9a1d",
    bg: "rgba(253,236,200,0.65)",
    darkDot: "#cb9a1d",
    darkBg: "rgba(137,99,42,0.35)",
  },
  pink: {
    dot: "#d15796",
    bg: "rgba(245,224,233,0.65)",
    darkDot: "#d15796",
    darkBg: "rgba(105,49,76,0.35)",
  },
  gray: {
    dot: "#9b9a97",
    bg: "rgba(227,226,224,0.65)",
    darkDot: "#9b9a97",
    darkBg: "rgba(90,90,90,0.35)",
  },
  brown: {
    dot: "#937264",
    bg: "rgba(238,224,218,0.65)",
    darkDot: "#937264",
    darkBg: "rgba(96,59,44,0.35)",
  },
}

function SortableColumnHeader({
  col,
  isDark,
  action,
}: {
  col: ColumnDef
  isDark: boolean
  action?: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id })

  const colors = NOTION_COLORS[col.color]
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    backgroundColor: isDark ? colors.darkBg : colors.bg,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${COL_CLASS} flex items-center gap-2 px-3 h-8 rounded-md cursor-grab active:cursor-grabbing`}
    >
      <span
        className="size-2.5 rounded-[4px] shrink-0"
        style={{ backgroundColor: isDark ? colors.darkDot : colors.dot }}
      />
      <span className="text-xs font-medium flex-1">{col.title}</span>
      {action && (
        <span
          role="toolbar"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {action}
        </span>
      )}
    </div>
  )
}

const SCOPE_LABELS: Record<string, string> = {
  user: "User",
  project: "Project",
}

interface ColumnDef {
  id: BoardColumnId
  title: string
  icon: ElementType
  /** Scopes this column appears in */
  scopes: string[]
  /** Notion color key */
  color: string
}

export function BoardLayout() {
  const { activeProjectPath } = useProjectContext()
  const [selected, setSelected] = useState<DashboardDetailTarget>(null)
  const handleAction = useEntityActionHandler(() => setSelected(null))
  const [collapsedScopes, setCollapsedScopes] = useState<Set<string>>(new Set())
  const { boardConfig, toggleColumn, setColumnOrder } = useBoardConfig()

  // ── Add-dialog state ──
  type AddDialogState = {
    colId: "skills" | "agents" | "hooks" | "mcp"
    scope: Scope | HookScope
  } | null
  const [addDialog, setAddDialog] = useState<AddDialogState>(null)
  const { resolved: themeMode } = useTheme()
  // Plugins collapse signal: even = all collapsed, odd = all expanded
  const [pluginsCollapseSignal, setPluginsCollapseSignal] = useState(0)

  // ── Data queries (lifted from individual panels) ──
  const {
    query: { data: skills = [], isLoading: skillsLoading },
  } = useAgentFiles("skill")
  const {
    query: { data: agents = [], isLoading: agentsLoading },
  } = useAgentFiles("agent")
  const { data: globalHooks = {}, isLoading: globalHooksLoading } =
    useHooksQuery("user")
  const { data: projectHooks = {}, isLoading: projectHooksLoading } =
    useHooksQuery("project")
  const { data: mcpServers = [], isLoading: mcpLoading } = useMcpQuery()
  const { toggleMutation } = useMcpMutations()
  const { data: memoryFiles = [], isLoading: memoryLoading } = useMemoryFiles()

  const hookItems = useMemo<HookItem[]>(() => {
    return [
      ...buildHookItems(globalHooks, "user"),
      ...buildHookItems(projectHooks, "project"),
    ]
  }, [globalHooks, projectHooks])

  // Plugin-provided servers are shown in the Plugins panel — exclude here
  const directMcpServers = useMemo(
    () => mcpServers.filter((s) => !s.fromPlugin),
    [mcpServers],
  )

  function toggleScope(scope: string) {
    setCollapsedScopes((prev) => {
      const next = new Set(prev)
      next.has(scope) ? next.delete(scope) : next.add(scope)
      return next
    })
  }

  const allColumnDefs: ColumnDef[] = [
    {
      id: "files",
      title: "Files",
      icon: FileTextIcon,
      scopes: ["user", "project"],
      color: "gray",
    },
    {
      id: "plugins",
      title: "Plugins",
      icon: ENTITY_ICONS.plugin,
      scopes: ["user", "project"],
      color: "blue",
    },
    {
      id: "mcp",
      title: "MCP Servers",
      icon: ENTITY_ICONS.mcp,
      scopes: ["user", "project"],
      color: "purple",
    },
    {
      id: "skills",
      title: "Skills",
      icon: ENTITY_ICONS.skill,
      scopes: ["user", "project"],
      color: "green",
    },
    {
      id: "agents",
      title: "Agents",
      icon: ENTITY_ICONS.agent,
      scopes: ["user", "project"],
      color: "orange",
    },
    {
      id: "hooks",
      title: "Hooks",
      icon: ENTITY_ICONS.hook,
      scopes: ["user", "project"],
      color: "yellow",
    },
    ...(activeProjectPath
      ? [
          {
            id: "memory" as BoardColumnId,
            title: "Memory",
            icon: BrainIcon,
            scopes: ["project"] as string[],
            color: "pink",
          },
        ]
      : []),
    {
      id: "lsp",
      title: "LSP Servers",
      icon: Code,
      scopes: ["user", "project"],
      color: "brown",
    },
  ]

  // Apply column order and visibility from board config
  const hiddenColumns = boardConfig?.hiddenColumns ?? []
  const columnOrder = boardConfig?.columnOrder

  const columnDefs = columnOrder
    ? columnOrder
        .map((id) => allColumnDefs.find((c) => c.id === id))
        .filter(
          (c): c is ColumnDef =>
            c !== undefined && !hiddenColumns.includes(c.id),
        )
    : allColumnDefs.filter((c) => !hiddenColumns.includes(c.id))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const currentOrder =
      boardConfig?.columnOrder ?? allColumnDefs.map((c) => c.id)
    const oldIndex = currentOrder.indexOf(active.id as BoardColumnId)
    const newIndex = currentOrder.indexOf(over.id as BoardColumnId)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = [...currentOrder]
    newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, active.id as BoardColumnId)
    setColumnOrder(newOrder)
  }

  const scopes = activeProjectPath ? ["user", "project"] : ["user"]

  function renderPanel(colId: string, scope: string) {
    const common = {
      scopeFilter: scope,
      onSelectItem: setSelected as (target: unknown) => void,
      onAction: handleAction as (id: string, target: unknown) => void,
    }
    switch (colId) {
      case "files":
        return <FilesPanel scopeFilter={scope} onSelectItem={setSelected} />
      case "plugins":
        return (
          <PluginsPanel
            scopeFilter={scope}
            onSelectItem={setSelected}
            onAction={handleAction}
            collapseSignal={pluginsCollapseSignal}
          />
        )
      case "mcp":
        return (
          <EntityListPanel
            config={mcpConfig}
            items={directMcpServers}
            scopeFilter={scope}
            onSelectItem={common.onSelectItem}
            onAction={common.onAction}
            emptyDescription={m.board_no_mcp()}
            isLoading={mcpLoading}
            renderTrailing={(server) => (
              <span className="flex items-center gap-1">
                <Switch
                  size="sm"
                  checked={!server.disabled}
                  disabled={toggleMutation.isPending}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate(
                      { name: server.name, enable: !!checked },
                      {
                        onError: () => toast.error(m.mcp_toggle_error()),
                      },
                    )
                  }}
                />
              </span>
            )}
          />
        )
      case "skills":
        return (
          <EntityListPanel
            config={skillConfig}
            items={skills}
            {...common}
            emptyDescription={m.board_no_skills()}
            isLoading={skillsLoading}
          />
        )
      case "agents":
        return (
          <EntityListPanel
            config={agentConfig}
            items={agents}
            {...common}
            emptyDescription={m.board_no_agents()}
            isLoading={agentsLoading}
          />
        )
      case "hooks":
        return (
          <EntityListPanel
            config={hookConfig}
            items={hookItems}
            {...common}
            emptyDescription={m.board_no_hooks()}
            isLoading={globalHooksLoading && projectHooksLoading}
          />
        )
      case "memory":
        return (
          <EntityListPanel
            config={memoryConfig}
            items={memoryFiles}
            onSelectItem={common.onSelectItem}
            emptyDescription={m.board_no_memory()}
            isLoading={memoryLoading}
          />
        )
      case "lsp":
        return <LspServersPanel scopeFilter={scope} />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar — outside scroll area, never scrolls horizontally */}
      <div className="flex items-center justify-end px-3 pt-3 pb-1 shrink-0">
        <BoardColumnSettings
          columnOrder={
            boardConfig?.columnOrder ?? allColumnDefs.map((c) => c.id)
          }
          hiddenColumns={hiddenColumns}
          onToggle={toggleColumn}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-auto pb-3">
          <div className="inline-flex flex-col min-w-full">
            {/* Sticky column headers */}
            <div className="flex gap-3 sticky top-0 z-10 bg-background px-3 pt-1 pb-2 items-center">
              <SortableContext
                items={columnDefs.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {columnDefs.map((col) => (
                  <SortableColumnHeader
                    key={col.id}
                    col={col}
                    isDark={themeMode === "dark"}
                    action={
                      col.id === "plugins" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => setPluginsCollapseSignal((s) => s + 1)}
                        >
                          {pluginsCollapseSignal % 2 === 0 ? (
                            <ChevronsUpDown data-icon />
                          ) : (
                            <ChevronsDownUp data-icon />
                          )}
                        </Button>
                      ) : col.id === "skills" ||
                        col.id === "agents" ||
                        col.id === "hooks" ||
                        col.id === "mcp" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() =>
                            setAddDialog({
                              colId: col.id as
                                | "skills"
                                | "agents"
                                | "hooks"
                                | "mcp",
                              scope: "user",
                            })
                          }
                        >
                          <PlusIcon data-icon />
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </SortableContext>
            </div>

            {/* Scope rows — each row spans all columns */}
            <div className="px-3">
              {scopes.map((scope) => {
                const isOpen = !collapsedScopes.has(scope)
                return (
                  <Collapsible
                    key={scope}
                    open={isOpen}
                    onOpenChange={() => toggleScope(scope)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b border-border/50"
                      >
                        {isOpen ? (
                          <ChevronDown className="size-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0" />
                        )}
                        {SCOPE_LABELS[scope] ?? scope}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex gap-3 py-2">
                        {columnDefs.map((col) => (
                          <div key={col.id} className={COL_CLASS}>
                            {col.scopes.includes(scope) && (
                              <div className="border border-border rounded-lg p-1">
                                {renderPanel(col.id, scope)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        </div>
      </DndContext>

      {/* Add dialogs */}
      {addDialog?.colId === "hooks" && (
        <AddHookDialog
          scope={addDialog.scope as HookScope}
          onClose={() => setAddDialog(null)}
        />
      )}
      {addDialog?.colId === "skills" && (
        <AddSkillDialog
          scope={addDialog.scope as Scope}
          onClose={() => setAddDialog(null)}
        />
      )}
      {addDialog?.colId === "agents" && (
        <AddAgentDialog
          scope={addDialog.scope as Scope}
          onClose={() => setAddDialog(null)}
        />
      )}
      {addDialog?.colId === "mcp" && (
        <AddMcpDialog
          scope={addDialog.scope as Scope}
          onClose={() => setAddDialog(null)}
        />
      )}

      {/* Detail drawer — Sheet overlay */}
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="data-[side=right]:w-2/3 data-[side=right]:lg:w-1/2 data-[side=right]:sm:max-w-none min-w-[400px] p-0 flex flex-col"
        >
          <DetailPanelContent
            target={selected}
            onClose={() => setSelected(null)}
            onAction={handleAction}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

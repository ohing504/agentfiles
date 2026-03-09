// src/features/dashboard/components/BoardLayout.tsx
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
import { BrainIcon, ChevronDown, ChevronRight, Code } from "lucide-react"
import type { ElementType } from "react"
import { useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useTheme } from "@/hooks/use-theme"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import type { BoardColumnId } from "@/shared/types"
import { useBoardConfig } from "../hooks/use-board-config"
import { useEntityActionHandler } from "../hooks/use-entity-action-handler"
import type { DashboardDetailTarget } from "../types"
import { AgentsPanel } from "./AgentsPanel"
import { BoardColumnSettings } from "./BoardColumnSettings"
import { DetailPanelContent } from "./DetailPanelContent"
import { HooksPanel } from "./HooksPanel"
import { LspServersPanel } from "./LspServersPanel"
import { McpDirectPanel } from "./McpDirectPanel"
import { MemoryPanel } from "./MemoryPanel"
import { PluginsPanel } from "./PluginsPanel"
import { SkillsPanel } from "./SkillsPanel"

const COL_CLASS = "w-[280px] min-w-[280px] shrink-0"

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
}

function SortableColumnHeader({
  col,
  isDark,
}: {
  col: ColumnDef
  isDark: boolean
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
      <span className="text-xs font-medium">{col.title}</span>
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
  const { resolved: themeMode } = useTheme()

  function toggleScope(scope: string) {
    setCollapsedScopes((prev) => {
      const next = new Set(prev)
      next.has(scope) ? next.delete(scope) : next.add(scope)
      return next
    })
  }

  const allColumnDefs: ColumnDef[] = [
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
      color: "gray",
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
      onSelectItem: setSelected,
      onAction: handleAction,
    }
    switch (colId) {
      case "plugins":
        return <PluginsPanel {...common} />
      case "mcp":
        return <McpDirectPanel {...common} />
      case "skills":
        return <SkillsPanel {...common} />
      case "agents":
        return <AgentsPanel {...common} />
      case "hooks":
        return <HooksPanel {...common} />
      case "memory":
        return <MemoryPanel onSelectItem={setSelected} />
      case "lsp":
        return <LspServersPanel scopeFilter={scope} />
      default:
        return null
    }
  }

  return (
    <>
      {/* Toolbar — outside scroll area, never scrolls horizontally */}
      <div className="flex items-center justify-end px-3 pt-3 pb-1">
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
        <div className="h-full overflow-auto pb-3">
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

      {/* Detail drawer — Sheet overlay */}
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent
          side="right"
          className="w-1/2 min-w-[400px] sm:max-w-none p-0 flex flex-col"
        >
          <DetailPanelContent
            target={selected}
            activeProjectPath={activeProjectPath}
            onClose={() => setSelected(null)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

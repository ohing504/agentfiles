// src/features/dashboard/components/BoardLayout.tsx
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
}

export function BoardLayout() {
  const { activeProjectPath } = useProjectContext()
  const [selected, setSelected] = useState<DashboardDetailTarget>(null)
  const handleAction = useEntityActionHandler(() => setSelected(null))
  const [collapsedScopes, setCollapsedScopes] = useState<Set<string>>(new Set())
  const { boardConfig, toggleColumn } = useBoardConfig()

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
    },
    {
      id: "mcp",
      title: "MCP Servers",
      icon: ENTITY_ICONS.mcp,
      scopes: ["user", "project"],
    },
    {
      id: "skills",
      title: "Skills",
      icon: ENTITY_ICONS.skill,
      scopes: ["user", "project"],
    },
    {
      id: "agents",
      title: "Agents",
      icon: ENTITY_ICONS.agent,
      scopes: ["user", "project"],
    },
    {
      id: "hooks",
      title: "Hooks",
      icon: ENTITY_ICONS.hook,
      scopes: ["user", "project"],
    },
    ...(activeProjectPath
      ? [
          {
            id: "memory" as BoardColumnId,
            title: "Memory",
            icon: BrainIcon,
            scopes: ["project"] as string[],
          },
        ]
      : []),
    {
      id: "lsp",
      title: "LSP Servers",
      icon: Code,
      scopes: ["user", "project"],
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

      <div className="h-full overflow-auto pb-3">
        <div className="inline-flex flex-col min-w-full">
          {/* Sticky column headers */}
          <div className="flex gap-3 sticky top-0 z-10 bg-background px-3 pt-1 pb-2 items-center">
            {columnDefs.map((col) => (
              <div
                key={col.id}
                className={`${COL_CLASS} flex items-center gap-2 px-3 h-9 border border-border rounded-lg bg-muted`}
              >
                <col.icon className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold">{col.title}</span>
              </div>
            ))}
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

import { ExternalLink, Pencil, Search, Trash2, Zap } from "lucide-react"
import { useState } from "react"
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
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useHooks } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"
import type { HookScope, HooksSettings } from "@/shared/types"
import { getHookDisplayName, type SelectedHook } from "../constants"
import { AddHookDialog } from "./AddHookDialog"
import { HookDetailPanel } from "./HookDetailPanel"
import { HooksScopeSection } from "./HooksScopeSection"

// ── HooksPageContent ─────────────────────────────────────────────────────────

export function HooksPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [selectedHook, setSelectedHook] = useState<SelectedHook | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogScope, setAddDialogScope] = useState<HookScope | null>(null)
  const [editingHook, setEditingHook] = useState<SelectedHook | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SelectedHook | null>(null)

  const {
    query: globalQuery,
    addMutation: globalAdd,
    removeMutation: globalRemove,
  } = useHooks("global")
  const {
    query: projectQuery,
    addMutation: projectAdd,
    removeMutation: projectRemove,
  } = useHooks("project")
  const {
    query: localQuery,
    addMutation: localAdd,
    removeMutation: localRemove,
  } = useHooks("local")

  const isLoading =
    globalQuery.isLoading || projectQuery.isLoading || localQuery.isLoading

  if (isLoading) {
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

  const globalHooks: HooksSettings = globalQuery.data ?? {}
  const projectHooks: HooksSettings = projectQuery.data ?? {}
  const localHooks: HooksSettings = localQuery.data ?? {}

  function handleDelete(hook: SelectedHook) {
    const mutation =
      hook.scope === "global"
        ? globalRemove
        : hook.scope === "local"
          ? localRemove
          : projectRemove
    mutation.mutate(
      {
        event: hook.event,
        groupIndex: hook.groupIndex,
        hookIndex: hook.hookIndex,
      },
      {
        onSuccess: () => setSelectedHook(null),
      },
    )
  }

  const addMutation =
    addDialogScope === "global"
      ? globalAdd
      : addDialogScope === "local"
        ? localAdd
        : projectAdd

  return (
    <div className="flex h-full">
      {/* 좌측 패널 */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        {/* 좌측 헤더 */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">Hooks</h2>
          <a
            href={m.claude_hook_docs_url()}
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
              placeholder="Search hooks..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <HooksScopeSection
            label="Global"
            scope="global"
            hooks={globalHooks}
            searchQuery={searchQuery}
            selectedHook={selectedHook}
            onSelectHook={setSelectedHook}
            onAddClick={() => setAddDialogScope("global")}
          />
          {activeProjectPath && (
            <>
              <HooksScopeSection
                label="Project"
                scope="project"
                hooks={projectHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={setSelectedHook}
                onAddClick={() => setAddDialogScope("project")}
              />
              <HooksScopeSection
                label="Local"
                scope="local"
                hooks={localHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={setSelectedHook}
                onAddClick={() => setAddDialogScope("local")}
              />
            </>
          )}
        </div>
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedHook ? (
          <>
            {/* 우측 헤더 */}
            <div className="flex items-center justify-between px-4 h-12 shrink-0">
              <h2 className="text-sm font-semibold truncate min-w-0">
                {getHookDisplayName(selectedHook.hook)}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    {m.action_edit()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setEditingHook(selectedHook)}
                  >
                    <Pencil className="size-4" />
                    {m.action_edit()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingDelete(selectedHook)}
                  >
                    <Trash2 className="size-4" />
                    {m.action_delete()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* 상세 내용 */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <HookDetailPanel
                selectedHook={selectedHook}
                activeProjectPath={activeProjectPath}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Zap />
                </EmptyMedia>
                <EmptyTitle>No Hook Selected</EmptyTitle>
                <EmptyDescription>
                  Select a hook from the left panel to view its details.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hook? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  handleDelete(pendingDelete)
                  setPendingDelete(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Hook Dialog */}
      {addDialogScope != null && (
        <AddHookDialog
          scope={addDialogScope}
          onClose={() => setAddDialogScope(null)}
          addMutation={addMutation}
        />
      )}

      {/* Edit Hook Dialog */}
      {editingHook != null && (
        <AddHookDialog
          scope={editingHook.scope}
          onClose={() => setEditingHook(null)}
          addMutation={
            editingHook.scope === "global"
              ? globalAdd
              : editingHook.scope === "local"
                ? localAdd
                : projectAdd
          }
          removeMutation={
            editingHook.scope === "global"
              ? globalRemove
              : editingHook.scope === "local"
                ? localRemove
                : projectRemove
          }
          editHook={editingHook}
        />
      )}
    </div>
  )
}

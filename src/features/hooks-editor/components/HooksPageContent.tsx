import { ExternalLink, Search, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { HookDetailPanel } from "@/components/HookDetailPanel"
import { useProjectContext } from "@/components/ProjectContext"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { isHookFilePath, resolveHookFilePath } from "@/lib/hook-utils"
import { m } from "@/paraglide/messages"
import { useHooksMutations } from "../api/hooks.queries"
import type { SelectedHook } from "../constants"
import { useHooksSelection } from "../context/HooksContext"
import { AddHookDialog } from "./AddHookDialog"
import { HooksScopeSection } from "./HooksScopeSection"

export function HooksPageContent() {
  const { activeProjectPath } = useProjectContext()
  const [searchQuery, setSearchQuery] = useState("")
  const {
    globalHooks,
    projectHooks,
    localHooks,
    isLoading,
    selectedHook,
    handleSelectHook,
    handleClearSelection,
    editingHook,
    setEditingHook,
    addDialogScope,
    handleAddClick,
    handleAddClose,
  } = useHooksSelection()

  const { removeMutation: removeGlobalMutation } = useHooksMutations("user")
  const { removeMutation: removeProjectMutation } = useHooksMutations("project")
  const { removeMutation: removeLocalMutation } = useHooksMutations("local")

  function getRemoveMutation(scope: "user" | "project" | "local") {
    if (scope === "project") return removeProjectMutation
    if (scope === "local") return removeLocalMutation
    return removeGlobalMutation
  }

  function handleDeleteHook() {
    if (!selectedHook) return
    getRemoveMutation(selectedHook.scope).mutate(
      {
        event: selectedHook.event,
        groupIndex: selectedHook.groupIndex,
        hookIndex: selectedHook.hookIndex,
      },
      {
        onSuccess: handleClearSelection,
        onError: (e) => toast.error(e.message || m.hooks_delete_error()),
      },
    )
  }

  function handleDeleteSpecificHook(hook: SelectedHook) {
    getRemoveMutation(hook.scope).mutate(
      {
        event: hook.event,
        groupIndex: hook.groupIndex,
        hookIndex: hook.hookIndex,
      },
      {
        onSuccess: () => {
          if (
            selectedHook?.scope === hook.scope &&
            selectedHook?.event === hook.event &&
            selectedHook?.groupIndex === hook.groupIndex &&
            selectedHook?.hookIndex === hook.hookIndex
          ) {
            handleClearSelection()
          }
        },
        onError: (e) => toast.error(e.message || m.hooks_delete_error()),
      },
    )
  }

  const resolvedFilePath =
    selectedHook && isHookFilePath(selectedHook.hook)
      ? resolveHookFilePath(selectedHook.hook.command ?? "", {
          projectPath: activeProjectPath,
        })
      : undefined

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

  return (
    <div className="flex h-full">
      {/* 좌측 패널 */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">{m.hooks_title()}</h2>
          <a
            href={m.claude_hook_docs_url()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {m.common_docs()}
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={m.hooks_search_placeholder()}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <HooksScopeSection
            label="User"
            scope="user"
            hooks={globalHooks}
            searchQuery={searchQuery}
            selectedHook={selectedHook}
            onSelectHook={handleSelectHook}
            onAddClick={() => handleAddClick("user")}
            onDeleteHook={handleDeleteSpecificHook}
            onEditHook={(hook: SelectedHook) => setEditingHook(hook)}
          />
          {activeProjectPath && (
            <>
              <HooksScopeSection
                label="Project"
                scope="project"
                hooks={projectHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={handleSelectHook}
                onAddClick={() => handleAddClick("project")}
                onDeleteHook={handleDeleteSpecificHook}
                onEditHook={(hook: SelectedHook) => setEditingHook(hook)}
              />
              <HooksScopeSection
                label="Local"
                scope="local"
                hooks={localHooks}
                searchQuery={searchQuery}
                selectedHook={selectedHook}
                onSelectHook={handleSelectHook}
                onAddClick={() => handleAddClick("local")}
                onDeleteHook={handleDeleteSpecificHook}
                onEditHook={(hook: SelectedHook) => setEditingHook(hook)}
              />
            </>
          )}
        </div>
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedHook ? (
          <HookDetailPanel
            hook={selectedHook.hook}
            event={selectedHook.event}
            matcher={selectedHook.matcher}
            filePath={resolvedFilePath}
            activeProjectPath={activeProjectPath}
            onEdit={() => setEditingHook(selectedHook)}
            onDelete={handleDeleteHook}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Zap />
                </EmptyMedia>
                <EmptyTitle>{m.hooks_empty_title()}</EmptyTitle>
                <EmptyDescription>{m.hooks_empty_desc()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Add Hook Dialog */}
      {addDialogScope != null && (
        <AddHookDialog scope={addDialogScope} onClose={handleAddClose} />
      )}

      {/* Edit Hook Dialog */}
      {editingHook != null && (
        <AddHookDialog
          scope={editingHook.scope}
          onClose={() => setEditingHook(null)}
          editHook={editingHook}
        />
      )}
    </div>
  )
}

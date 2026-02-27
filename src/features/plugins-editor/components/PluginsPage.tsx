import { AlertTriangle, ExternalLink, Plug2Icon, Search } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useProjectContext } from "@/components/ProjectContext"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { m } from "@/paraglide/messages"
import { usePluginsQuery } from "../api/plugins.queries"
import { PluginsProvider, usePluginsSelection } from "../context/PluginsContext"
import { PluginActionBar } from "./PluginActionBar"
import { PluginComponentDetail } from "./PluginComponentDetail"
import { PluginComponentList } from "./PluginComponentList"
import { PluginList } from "./PluginList"
import { PluginOverview } from "./PluginOverview"

function PluginsRightPanel() {
  const {
    selectedPlugin,
    setSelectedPluginId,
    selectedComponentType,
    selectedItemId,
    setSelectedItemId,
    handleSelectComponentType,
  } = usePluginsSelection()

  // State 1: Plugin selected, no componentType → overview panel
  if (selectedPlugin && !selectedComponentType) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <PluginActionBar
          plugin={selectedPlugin}
          onUninstalled={() => setSelectedPluginId(null)}
        />
        <PluginOverview
          plugin={selectedPlugin}
          onSelectComponentType={(compType) =>
            handleSelectComponentType(selectedPlugin, compType)
          }
          onSelectItem={(compType, itemId) => {
            handleSelectComponentType(selectedPlugin, compType)
            setSelectedItemId(itemId)
          }}
        />
      </div>
    )
  }

  // State 2: Plugin + componentType selected → list + detail
  if (selectedPlugin && selectedComponentType && selectedPlugin.contents) {
    return (
      <>
        <PluginComponentList
          contents={selectedPlugin.contents}
          componentType={selectedComponentType}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {selectedItemId ? (
            <PluginComponentDetail
              contents={selectedPlugin.contents}
              componentType={selectedComponentType}
              itemId={selectedItemId}
              pluginInstallPath={selectedPlugin.installPath}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {m.plugin_select_item()}
              </p>
            </div>
          )}
        </div>
      </>
    )
  }

  // State 3: Nothing selected → empty state
  return (
    <div className="flex-1 flex items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plug2Icon />
          </EmptyMedia>
          <EmptyTitle>{m.plugin_no_selection()}</EmptyTitle>
          <EmptyDescription>{m.plugin_no_selection_desc()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

function PluginsPageInner() {
  const { activeProjectPath } = useProjectContext()
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const { isLoading } = usePluginsQuery(activeProjectPath ?? undefined)

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

  const panel1Width = "w-[280px]"

  return (
    <div className="flex h-full">
      {/* Panel 1 — Plugin List */}
      <div
        className={`${panel1Width} shrink-0 border-r border-border flex flex-col transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <h2 className="text-sm font-semibold">{m.plugin_title()}</h2>
          <a
            href="https://docs.anthropic.com/en/docs/claude-code/plugins"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {m.common_docs()}
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Search + List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={m.plugin_search_placeholder()}
              aria-label="Search plugins"
              className="pl-8 h-8 text-xs"
            />
          </div>

          <PluginList searchQuery={deferredSearchQuery} />
        </div>
      </div>

      {/* Right panels */}
      <PluginsRightPanel />
    </div>
  )
}

function PluginsErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">{m.plugin_render_error()}</p>
        <p className="text-xs text-muted-foreground">
          {m.plugin_render_error_desc()}
        </p>
      </div>
    </div>
  )
}

export function PluginsPage() {
  const { setOpen: setSidebarOpen } = useSidebar()
  return (
    <ErrorBoundary fallback={<PluginsErrorFallback />}>
      <PluginsProvider onSelect={() => setSidebarOpen(false)}>
        <PluginsPageInner />
      </PluginsProvider>
    </ErrorBoundary>
  )
}

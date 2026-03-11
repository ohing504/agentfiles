// src/components/board/DetailPanelContent.tsx
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import type { FileItem } from "@/config/entities/file-config"
import type { HookItem } from "@/config/entities/hook-config"
import { useMcpMutations, useMcpQuery } from "@/hooks/use-mcp"
import type { EntityActionId } from "@/lib/entity-actions"
import { m } from "@/paraglide/messages"
import { EntityDetailPanel } from "./EntityDetailPanel"
import type { DashboardDetailTarget } from "./types"

interface DetailPanelContentProps {
  target: DashboardDetailTarget
  onClose?: () => void
  onAction?: (
    actionId: EntityActionId,
    target: NonNullable<DashboardDetailTarget>,
  ) => void
}

function McpToggle({
  serverName,
  scope,
}: {
  serverName: string
  scope: string
}) {
  const { toggleMutation } = useMcpMutations()
  const { data: servers = [] } = useMcpQuery()
  const freshServer = servers.find(
    (s) => s.name === serverName && s.scope === scope,
  )
  const isEnabled = freshServer ? !freshServer.disabled : true
  const isFromPlugin = freshServer?.fromPlugin

  if (isFromPlugin) return null

  return (
    <Switch
      size="sm"
      checked={isEnabled}
      disabled={toggleMutation.isPending}
      onCheckedChange={(checked) => {
        toggleMutation.mutate(
          { name: serverName, enable: !!checked },
          { onError: () => toast.error(m.mcp_toggle_error()) },
        )
      }}
    />
  )
}

function extractItem(target: NonNullable<DashboardDetailTarget>): unknown {
  switch (target.type) {
    case "skill":
      return target.skill
    case "agent":
      return target.agent
    case "hook": {
      const hookItem: HookItem = {
        entry: target.hook,
        event: target.event,
        matcher: target.matcher,
        scope: (target.scope ?? "user") as HookItem["scope"],
      }
      return hookItem
    }
    case "mcp":
      return target.server
    case "plugin":
      return target.plugin
    case "file": {
      const fileItem: FileItem = {
        path: target.filePath,
        name: target.filePath.split("/").pop() ?? target.filePath,
      }
      return fileItem
    }
    case "memory":
      return target.file
  }
}

export function DetailPanelContent({
  target,
  onClose,
  onAction,
}: DetailPanelContentProps) {
  if (!target) return null

  const item = extractItem(target)

  const headerTrailing =
    target.type === "mcp" ? (
      <McpToggle serverName={target.server.name} scope={target.server.scope} />
    ) : undefined

  return (
    <EntityDetailPanel
      type={target.type}
      item={item}
      onClose={onClose}
      onAction={onAction ? (actionId) => onAction(actionId, target) : undefined}
      headerTrailing={headerTrailing}
    />
  )
}

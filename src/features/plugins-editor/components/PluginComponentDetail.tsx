import { toast } from "sonner"
import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { HookDetailPanel } from "@/components/HookDetailPanel"
import { CursorIcon, VscodeIcon } from "@/components/icons/editor-icons"
import { McpDetailPanel } from "@/components/McpDetailPanel"
import { SkillDetailPanel } from "@/components/SkillDetailPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { isHookFilePath, resolveHookFilePath } from "@/lib/hook-utils"
import { m } from "@/paraglide/messages"
import type { PluginComponents } from "@/shared/types"
import type { PluginComponentType } from "../types"

function DetailHeader({ name, filePath }: { name: string; filePath?: string }) {
  async function handleOpenInEditor(editor: "code" | "cursor") {
    if (!filePath) return
    try {
      const { openInEditorFn } = await import("@/server/editor")
      await openInEditorFn({ data: { filePath, editor } })
    } catch {
      toast.error(`Failed to open in ${editor}`)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border">
      <h2 className="text-sm font-semibold truncate min-w-0">{name}</h2>
      {filePath && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              {m.action_edit()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenInEditor("code")}>
              <VscodeIcon className="size-4" />
              {m.plugin_open_vscode()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenInEditor("cursor")}>
              <CursorIcon className="size-4" />
              {m.plugin_open_cursor()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function PluginComponentDetail({
  contents,
  componentType,
  itemId,
  pluginInstallPath,
}: {
  contents: PluginComponents
  componentType: PluginComponentType
  itemId: string
  pluginInstallPath?: string
}) {
  switch (componentType) {
    case "commands": {
      const file = contents.commands.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailPanel skill={file} />
    }
    case "skills": {
      const file = contents.skills.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailPanel skill={file} />
    }
    case "agents": {
      const file = contents.agents.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailPanel skill={file} />
    }
    case "outputStyles": {
      const file = contents.outputStyles.find(
        (f) => (f.path ?? f.name) === itemId,
      )
      if (!file) return <EmptyDetail />
      return <SkillDetailPanel skill={file} />
    }
    case "hooks": {
      const hooks = contents.hooks
      for (const [event, groups] of Object.entries(hooks)) {
        if (!Array.isArray(groups)) continue
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi]
          for (let hi = 0; hi < group.hooks.length; hi++) {
            if (`${event}-${gi}-${hi}` === itemId) {
              const hook = group.hooks[hi]
              const resolvedPath = isHookFilePath(hook)
                ? resolveHookFilePath(hook.command ?? "", { pluginInstallPath })
                : undefined
              return (
                <HookDetailPanel
                  hook={hook}
                  event={event}
                  matcher={group.matcher}
                  filePath={resolvedPath}
                />
              )
            }
          }
        }
      }
      return <EmptyDetail />
    }
    case "mcpServers": {
      const server = contents.mcpServers.find((s) => s.name === itemId)
      if (!server) return <EmptyDetail />
      return <McpDetailPanel server={server} filePath={pluginInstallPath} />
    }
    case "lspServers": {
      const server = contents.lspServers.find((s) => s.name === itemId)
      if (!server) return <EmptyDetail />
      return (
        <>
          <DetailHeader name={server.name} />
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label={m.plugin_field_name()}>
                <span className="text-sm font-medium">{server.name}</span>
              </DetailField>
              <DetailField label={m.plugin_field_command()}>
                <span className="font-mono text-xs">{server.command}</span>
              </DetailField>
              {server.transport && (
                <DetailField label={m.plugin_field_transport()}>
                  <Badge variant="secondary" className="text-xs">
                    {server.transport}
                  </Badge>
                </DetailField>
              )}
            </dl>
            {Object.keys(server.extensionToLanguage).length > 0 && (
              <>
                <Separator />
                <FileViewer
                  rawContent={JSON.stringify(
                    server.extensionToLanguage,
                    null,
                    2,
                  )}
                  isMarkdown={false}
                  lang="json"
                  className="flex-1"
                />
              </>
            )}
          </div>
        </>
      )
    }
    default:
      return <EmptyDetail />
  }
}

function EmptyDetail() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{m.plugin_select_item()}</p>
    </div>
  )
}

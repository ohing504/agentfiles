import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { SkillDetailView } from "@/components/SkillDetailView"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { m } from "@/paraglide/messages"
import type { PluginComponents } from "@/shared/types"
import type { PluginComponentType } from "../types"

export function PluginComponentDetail({
  contents,
  componentType,
  itemId,
}: {
  contents: PluginComponents
  componentType: PluginComponentType
  itemId: string
}) {
  switch (componentType) {
    case "commands": {
      const file = contents.commands.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailView skill={file} />
    }
    case "skills": {
      const file = contents.skills.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailView skill={file} />
    }
    case "agents": {
      const file = contents.agents.find((f) => (f.path ?? f.name) === itemId)
      if (!file) return <EmptyDetail />
      return <SkillDetailView skill={file} />
    }
    case "outputStyles": {
      const file = contents.outputStyles.find(
        (f) => (f.path ?? f.name) === itemId,
      )
      if (!file) return <EmptyDetail />
      return <SkillDetailView skill={file} />
    }
    case "hooks": {
      // itemId format: "EventName-groupIdx-hookIdx"
      const hooks = contents.hooks
      for (const [event, groups] of Object.entries(hooks)) {
        if (!Array.isArray(groups)) continue
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi]
          for (let hi = 0; hi < group.hooks.length; hi++) {
            if (`${event}-${gi}-${hi}` === itemId) {
              const hook = group.hooks[hi]
              return (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <DetailField label={m.plugin_field_event()}>
                      <span className="text-sm font-medium">{event}</span>
                    </DetailField>
                    <DetailField label={m.plugin_field_type()}>
                      <span className="text-sm font-medium">{hook.type}</span>
                    </DetailField>
                    {group.matcher && (
                      <DetailField label={m.plugin_field_matcher()}>
                        <span className="text-sm font-medium">
                          {group.matcher}
                        </span>
                      </DetailField>
                    )}
                  </dl>
                  <Separator />
                  {hook.command && (
                    <FileViewer
                      rawContent={hook.command}
                      isMarkdown={false}
                      lang="bash"
                      lineNumbers={false}
                    />
                  )}
                  {hook.prompt && (
                    <FileViewer
                      rawContent={hook.prompt}
                      isMarkdown={true}
                      lineNumbers={false}
                      className="flex-1"
                    />
                  )}
                </div>
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
      return (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailField label={m.plugin_field_name()}>
              <span className="text-sm font-medium">{server.name}</span>
            </DetailField>
            <DetailField label="Type">
              <Badge variant="secondary" className="text-xs">
                {server.type}
              </Badge>
            </DetailField>
            {server.command && (
              <DetailField label={m.plugin_field_command()}>
                <span className="font-mono text-xs">{server.command}</span>
              </DetailField>
            )}
            {server.url && (
              <DetailField label={m.plugin_field_url()}>
                <span className="font-mono text-xs">{server.url}</span>
              </DetailField>
            )}
          </dl>
          {(server.args || server.env) && (
            <>
              <Separator />
              <FileViewer
                rawContent={JSON.stringify(
                  { args: server.args, env: server.env },
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
      )
    }
    case "lspServers": {
      const server = contents.lspServers.find((s) => s.name === itemId)
      if (!server) return <EmptyDetail />
      return (
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
                rawContent={JSON.stringify(server.extensionToLanguage, null, 2)}
                isMarkdown={false}
                lang="json"
                className="flex-1"
              />
            </>
          )}
        </div>
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

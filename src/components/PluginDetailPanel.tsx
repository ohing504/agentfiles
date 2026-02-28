import { DetailField } from "@/components/DetailField"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Badge } from "@/components/ui/badge"
import { ENTITY_ICONS } from "@/lib/entity-icons"
import { titleCase } from "@/lib/format"
import type { Plugin } from "@/shared/types"

export function PluginDetailPanel({ plugin }: { plugin: Plugin }) {
  const contents = plugin.contents
  const skillCount = contents?.skills.length ?? 0
  const agentCount = contents?.agents.length ?? 0
  const mcpCount = contents?.mcpServers.length ?? 0
  const hookCount = Object.keys(contents?.hooks ?? {}).length
  const totalComponents = skillCount + agentCount + mcpCount + hookCount

  return (
    <>
      <div className="flex items-center gap-2 px-4 h-12 shrink-0 border-b border-border">
        <ENTITY_ICONS.plugin className="size-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-semibold truncate min-w-0">
          {titleCase(plugin.name)}
        </h2>
        <ScopeBadge scope={plugin.scope} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {plugin.description && (
          <p className="text-sm text-foreground">{plugin.description}</p>
        )}

        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {plugin.version && (
            <DetailField label="Version">
              <span className="text-sm font-mono">{plugin.version}</span>
            </DetailField>
          )}
          {plugin.author?.name && (
            <DetailField label="Author">
              <span className="text-sm">{plugin.author.name}</span>
            </DetailField>
          )}
          {plugin.marketplace && (
            <DetailField label="Source">
              <span className="text-sm">{plugin.marketplace}</span>
            </DetailField>
          )}
          {!plugin.enabled && (
            <DetailField label="Status">
              <Badge variant="secondary">Disabled</Badge>
            </DetailField>
          )}
        </dl>

        {totalComponents > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Components
            </p>
            <div className="flex flex-wrap gap-3">
              {skillCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <ENTITY_ICONS.skill className="size-3.5 text-muted-foreground" />
                  <span>Skills</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {skillCount}
                  </Badge>
                </div>
              )}
              {agentCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <ENTITY_ICONS.agent className="size-3.5 text-muted-foreground" />
                  <span>Agents</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {agentCount}
                  </Badge>
                </div>
              )}
              {mcpCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <ENTITY_ICONS.mcp className="size-3.5 text-muted-foreground" />
                  <span>MCP Servers</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {mcpCount}
                  </Badge>
                </div>
              )}
              {hookCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <ENTITY_ICONS.hook className="size-3.5 text-muted-foreground" />
                  <span>Hooks</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {hookCount}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

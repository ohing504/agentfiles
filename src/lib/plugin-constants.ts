import {
  Code,
  Palette,
  ScrollText,
  Server,
  SquareTerminal,
  Workflow,
  Zap,
} from "lucide-react"
import { m } from "@/paraglide/messages"
import type { PluginComponents, Scope } from "@/shared/types"

type PluginComponentType = keyof PluginComponents

export const SCOPE_ORDER: Scope[] = ["user", "project", "local", "managed"]
export const SCOPE_LABELS: Record<Scope, string> = {
  user: "User",
  project: "Project",
  local: "Local",
  managed: "Managed",
}

export const PLUGIN_COMPONENT_META: Record<
  PluginComponentType,
  {
    icon: typeof SquareTerminal
    labelFn: () => string
    descriptionFn: () => string
  }
> = {
  commands: {
    icon: SquareTerminal,
    labelFn: () => m.plugin_cat_commands(),
    descriptionFn: () => m.plugin_cat_desc_commands(),
  },
  skills: {
    icon: ScrollText,
    labelFn: () => m.plugin_cat_skills(),
    descriptionFn: () => m.plugin_cat_desc_skills(),
  },
  agents: {
    icon: Workflow,
    labelFn: () => m.plugin_cat_agents(),
    descriptionFn: () => m.plugin_cat_desc_agents(),
  },
  hooks: {
    icon: Zap,
    labelFn: () => m.plugin_cat_hooks(),
    descriptionFn: () => m.plugin_cat_desc_hooks(),
  },
  mcpServers: {
    icon: Server,
    labelFn: () => m.plugin_cat_mcp_servers(),
    descriptionFn: () => m.plugin_cat_desc_mcp_servers(),
  },
  lspServers: {
    icon: Code,
    labelFn: () => m.plugin_cat_lsp_servers(),
    descriptionFn: () => m.plugin_cat_desc_lsp_servers(),
  },
  outputStyles: {
    icon: Palette,
    labelFn: () => m.plugin_cat_output_styles(),
    descriptionFn: () => m.plugin_cat_desc_output_styles(),
  },
}

export const PLUGIN_COMPONENT_ORDER: PluginComponentType[] = [
  "commands",
  "skills",
  "agents",
  "hooks",
  "mcpServers",
  "lspServers",
  "outputStyles",
]

export function getNonEmptyComponents(
  contents: PluginComponents | undefined,
): PluginComponentType[] {
  if (!contents) return []
  return PLUGIN_COMPONENT_ORDER.filter((compType) => {
    const items = contents[compType]
    if (Array.isArray(items)) return items.length > 0
    if (typeof items === "object" && items !== null)
      return Object.keys(items).length > 0
    return false
  })
}

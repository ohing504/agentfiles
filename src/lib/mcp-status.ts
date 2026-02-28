import type { McpConnectionStatus } from "@/shared/types"

export const MCP_STATUS_ICON_CLASS: Record<McpConnectionStatus, string> = {
  connected: "text-emerald-500",
  needs_authentication: "text-amber-500",
  failed: "text-red-500",
  disabled: "text-muted-foreground/40",
  unknown: "text-muted-foreground",
}

/**
 * Returns Tailwind icon class for an MCP server based on its connection status.
 *
 * Claude registers plugin-provided servers with a fully-qualified name:
 *   `plugin:{pluginName}:{serverKey}`
 * e.g. a server named "context7" inside the "context7" plugin becomes
 *   `plugin:context7:context7` in `claude mcp list` output.
 *
 * Direct (non-plugin) servers use just `server.name` as the key.
 * We try both the plain name and the plugin-qualified name so callers
 * don't need to know which format the statusMap uses.
 */
export function getMcpIconClass(
  server: { disabled?: boolean; name: string; fromPlugin?: string },
  statusMap?: Record<string, McpConnectionStatus>,
): string {
  if (server.disabled) return MCP_STATUS_ICON_CLASS.disabled

  // statusMap === undefined means the query is still loading → pulsing indicator
  if (statusMap === undefined) return "text-muted-foreground/30 animate-pulse"

  const direct = statusMap[server.name]
  const pluginQualified = server.fromPlugin
    ? statusMap[`plugin:${server.fromPlugin}:${server.name}`]
    : undefined

  const status = direct ?? pluginQualified ?? "unknown"
  return MCP_STATUS_ICON_CLASS[status]
}

export type FilesScope = "global" | "project"
export const DEFAULT_SCOPE: FilesScope = "global"

/**
 * Map file extensions to lucide-react icon names.
 * Used by FileTree to display appropriate icons.
 */
export const EXTENSION_ICONS: Record<string, string> = {
  ".md": "FileText",
  ".json": "FileJson",
  ".ts": "Code",
  ".js": "Code",
  ".tsx": "Code",
  ".jsx": "Code",
  ".yaml": "FileText",
  ".yml": "FileText",
  ".txt": "FileText",
}

/** Well-known .claude/ file/dir descriptions */
export const KNOWN_ITEMS: Record<string, string> = {
  "CLAUDE.md": "Project instructions",
  "settings.json": "User settings",
  "settings.local.json": "Local settings (git-ignored)",
  agents: "Sub-agent definitions",
  commands: "Slash commands",
  skills: "Reusable skills",
  plugins: "Installed plugins",
  docs: "Custom documentation",
}

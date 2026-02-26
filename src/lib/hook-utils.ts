import type { HookEntry } from "@/shared/types"

const FILE_EXT_RE = /\.(sh|py|js|ts|cmd|bat|bash|zsh|rb|pl)(\s|$|['"])/

/** Hook command가 파일 경로인지 감지 */
export function isHookFilePath(hook: HookEntry): boolean {
  if (hook.type !== "command" || !hook.command) return false
  return (
    FILE_EXT_RE.test(hook.command) ||
    hook.command.includes("$CLAUDE_") ||
    hook.command.startsWith(".claude/")
  )
}

/** Hook command에서 파일 경로를 추출하고 변수를 치환 */
export function resolveHookFilePath(
  command: string,
  context?: {
    projectPath?: string | null
    pluginInstallPath?: string
  },
): string {
  let filePath = command.split(/\s/)[0] ?? ""
  filePath = filePath.replace(/^['"]|['"]$/g, "")
  if (context?.pluginInstallPath) {
    filePath = filePath
      .replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, context.pluginInstallPath)
      .replace(/\$CLAUDE_PLUGIN_ROOT/g, context.pluginInstallPath)
  }
  if (context?.projectPath) {
    filePath = filePath
      .replace(/"\$CLAUDE_PROJECT_DIR"/g, context.projectPath)
      .replace(/\$CLAUDE_PROJECT_DIR/g, context.projectPath)
  }
  return filePath
}

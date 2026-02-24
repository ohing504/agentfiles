import { useQuery } from "@tanstack/react-query"
import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { SelectedHook } from "../constants"

// ── HookDetailPanel ──────────────────────────────────────────────────────────

export function HookDetailPanel({
  selectedHook,
  activeProjectPath,
}: {
  selectedHook: SelectedHook
  activeProjectPath: string | null | undefined
}) {
  const { hook } = selectedHook

  const isFilePath =
    hook.type === "command" && hook.command
      ? /\.(sh|py|js|ts)(\s|$|")/.test(hook.command) ||
        hook.command.includes("$CLAUDE_PROJECT_DIR") ||
        hook.command.startsWith(".claude/")
      : false

  const scriptQuery = useQuery({
    queryKey: ["hook-script", hook.command, activeProjectPath],
    queryFn: async () => {
      const { readScriptFn } = await import("../api/hooks.functions")
      return readScriptFn({
        data: {
          filePath: hook.command ?? "",
          projectPath: activeProjectPath ?? undefined,
        },
      })
    },
    enabled: isFilePath && !!hook.command,
  })

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* 메타 정보 — 가로 그리드, 각 항목은 수직 스택 */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        <DetailField label="Event">
          <span className="text-sm font-medium">{selectedHook.event}</span>
        </DetailField>

        <DetailField label="Handler">
          <span className="text-sm font-medium">{hook.type}</span>
        </DetailField>

        {selectedHook.matcher && (
          <DetailField label="Matcher">
            <span className="text-sm font-medium">{selectedHook.matcher}</span>
          </DetailField>
        )}

        {hook.timeout != null && (
          <DetailField label="Timeout">
            <span className="text-sm font-medium">{hook.timeout}s</span>
          </DetailField>
        )}

        {hook.type === "command" && hook.async != null && (
          <DetailField label="Async">
            <span className="text-sm font-medium">
              {hook.async ? "Yes" : "No"}
            </span>
          </DetailField>
        )}

        {hook.once && (
          <DetailField label="Once">
            <span className="text-sm font-medium">Yes</span>
          </DetailField>
        )}
      </dl>

      {/* Status Message */}
      {hook.statusMessage && (
        <DetailField label="Status Message">
          <span className="text-sm">{hook.statusMessage}</span>
        </DetailField>
      )}

      <Separator />

      {/* command 타입 */}
      {hook.type === "command" && hook.command && (
        <>
          <DetailField label="Command">
            <FileViewer
              rawContent={hook.command}
              isMarkdown={false}
              lang="bash"
              lineNumbers={false}
            />
          </DetailField>

          {isFilePath && (
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <dt className="text-xs text-muted-foreground">Script Preview</dt>
              <dd className="flex-1 min-h-0">
                {scriptQuery.isLoading ? (
                  <Skeleton className="h-24 w-full rounded-md" />
                ) : scriptQuery.data?.content ? (
                  <FileViewer
                    rawContent={scriptQuery.data.content}
                    fileName={hook.command ?? ""}
                    isMarkdown={false}
                    className="flex-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    File not found or empty
                  </p>
                )}
              </dd>
            </div>
          )}
        </>
      )}

      {/* prompt / agent 타입 */}
      {(hook.type === "prompt" || hook.type === "agent") && hook.prompt && (
        <>
          <FileViewer
            rawContent={hook.prompt}
            isMarkdown={true}
            lineNumbers={false}
            className="flex-1"
          />

          {hook.model && (
            <DetailField label="Model">
              <span className="text-sm font-medium">{hook.model}</span>
            </DetailField>
          )}
        </>
      )}
    </div>
  )
}

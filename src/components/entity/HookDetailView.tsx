import { DetailField } from "@/components/DetailField"
import { FileViewer } from "@/components/FileViewer"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useHookScriptQuery } from "@/hooks/use-hooks"
import { m } from "@/paraglide/messages"
import type { HookEntry } from "@/shared/types"

interface HookDetailViewProps {
  hook: HookEntry
  event: string
  matcher?: string
  /** Resolved file path for script preview. Enables preview when provided. */
  resolvedFilePath?: string
  /** For script file preview path resolution on the server. */
  activeProjectPath?: string | null
  className?: string
}

export function HookDetailView({
  hook,
  event,
  matcher,
  resolvedFilePath,
  activeProjectPath,
  className,
}: HookDetailViewProps) {
  const scriptQuery = useHookScriptQuery(
    resolvedFilePath,
    activeProjectPath,
    !!resolvedFilePath,
  )

  return (
    <div className={`flex flex-col gap-6 h-full min-h-0 ${className ?? ""}`}>
      {/* Meta grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        <DetailField label={m.hooks_detail_event()}>
          <span className="text-sm font-medium">{event}</span>
        </DetailField>

        <DetailField label={m.hooks_detail_handler()}>
          <span className="text-sm font-medium">{hook.type}</span>
        </DetailField>

        {matcher && (
          <DetailField label={m.hooks_detail_matcher()}>
            <span className="text-sm font-medium">{matcher}</span>
          </DetailField>
        )}

        {hook.timeout != null && (
          <DetailField label={m.hooks_detail_timeout()}>
            <span className="text-sm font-medium">{hook.timeout}s</span>
          </DetailField>
        )}

        {hook.type === "command" && hook.async != null && (
          <DetailField label={m.hooks_detail_async()}>
            <span className="text-sm font-medium">
              {hook.async ? m.hooks_detail_yes() : m.hooks_detail_no()}
            </span>
          </DetailField>
        )}

        {hook.once && (
          <DetailField label={m.hooks_detail_once()}>
            <span className="text-sm font-medium">{m.hooks_detail_yes()}</span>
          </DetailField>
        )}
      </dl>

      {/* Status Message */}
      {hook.statusMessage && (
        <DetailField label={m.hooks_detail_status_message()}>
          <span className="text-sm">{hook.statusMessage}</span>
        </DetailField>
      )}

      <Separator />

      {/* command type */}
      {hook.type === "command" && hook.command && (
        <>
          <DetailField label={m.hooks_detail_command()}>
            <FileViewer
              rawContent={hook.command}
              isMarkdown={false}
              lang="bash"
              lineNumbers={false}
            />
          </DetailField>

          {resolvedFilePath && (
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <dt className="text-xs text-muted-foreground">
                {m.hooks_detail_script_preview()}
              </dt>
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
                    {m.hooks_detail_file_not_found()}
                  </p>
                )}
              </dd>
            </div>
          )}
        </>
      )}

      {/* prompt / agent type */}
      {(hook.type === "prompt" || hook.type === "agent") && hook.prompt && (
        <>
          <FileViewer
            rawContent={hook.prompt}
            isMarkdown={true}
            lineNumbers={false}
            className="flex-1"
          />

          {hook.model && (
            <DetailField label={m.hooks_detail_model()}>
              <span className="text-sm font-medium">{hook.model}</span>
            </DetailField>
          )}
        </>
      )}
    </div>
  )
}

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

const AUTH_FIELDS = [
  {
    key: "apiKeyHelper",
    label: "API Key Helper",
    placeholder: "e.g. /path/to/helper-script",
  },
  {
    key: "awsAuthRefresh",
    label: "AWS Auth Refresh",
    placeholder: "e.g. aws sso login",
  },
  {
    key: "awsCredentialExport",
    label: "AWS Credential Export",
    placeholder: "e.g. aws sts get-session-token",
  },
  {
    key: "otelHeadersHelper",
    label: "OTEL Headers Helper",
    placeholder: "e.g. /path/to/otel-helper",
  },
] as const

export function AuthSettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  return (
    <div className="space-y-4">
      {AUTH_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <Label className="shrink-0">{label}</Label>
          <Input
            value={(settings[key] as string) ?? ""}
            onChange={(e) => onUpdate(key, e.target.value || undefined)}
            placeholder={placeholder}
            className="flex-1 font-mono text-sm"
            disabled={isPending}
          />
        </div>
      ))}
    </div>
  )
}

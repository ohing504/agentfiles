import type { CategorySettingsProps } from "../ConfigSettingsPanel"

export function EnvironmentSettings({ settings }: CategorySettingsProps) {
  return (
    <div className="text-sm text-muted-foreground">
      {Object.keys(settings).length} settings loaded
    </div>
  )
}

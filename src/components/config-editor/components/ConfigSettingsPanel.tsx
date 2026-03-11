import type { CategoryId } from "../constants"
import { AuthSettings } from "./categories/AuthSettings"
import { DisplaySettings } from "./categories/DisplaySettings"
import { EnvironmentSettings } from "./categories/EnvironmentSettings"
import { GeneralSettings } from "./categories/GeneralSettings"
import { PermissionsSettings } from "./categories/PermissionsSettings"
import { SandboxSettings } from "./categories/SandboxSettings"

export interface CategorySettingsProps {
  settings: Record<string, unknown>
  onUpdate: (key: string, value: unknown) => void
  onDelete: (key: string) => void
  isPending: boolean
}

interface ConfigSettingsPanelProps extends CategorySettingsProps {
  category: CategoryId
}

export function ConfigSettingsPanel({
  category,
  settings,
  onUpdate,
  onDelete,
  isPending,
}: ConfigSettingsPanelProps) {
  const props = { settings, onUpdate, onDelete, isPending }

  switch (category) {
    case "general":
      return <GeneralSettings {...props} />
    case "permissions":
      return <PermissionsSettings {...props} />
    case "environment":
      return <EnvironmentSettings {...props} />
    case "sandbox":
      return <SandboxSettings {...props} />
    case "display":
      return <DisplaySettings {...props} />
    case "auth":
      return <AuthSettings {...props} />
  }
}

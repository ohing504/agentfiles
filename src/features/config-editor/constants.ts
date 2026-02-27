export type ConfigScope = "user" | "project" | "local"

export type CategoryId =
  | "general"
  | "permissions"
  | "environment"
  | "sandbox"
  | "display"
  | "auth"

export interface CategoryDef {
  id: CategoryId
  label: string
  /** Top-level settings.json keys belonging to this category */
  keys: string[]
}

export const CONFIG_CATEGORIES: CategoryDef[] = [
  {
    id: "general",
    label: "General",
    keys: [
      "model",
      "availableModels",
      "language",
      "outputStyle",
      "alwaysThinkingEnabled",
      "cleanupPeriodDays",
      "autoUpdatesChannel",
      "plansDirectory",
      "attribution",
      "respectGitignore",
    ],
  },
  {
    id: "permissions",
    label: "Permissions",
    keys: ["permissions"],
  },
  {
    id: "environment",
    label: "Environment",
    keys: ["env"],
  },
  {
    id: "sandbox",
    label: "Sandbox",
    keys: ["sandbox"],
  },
  {
    id: "display",
    label: "UI / Display",
    keys: [
      "showTurnDuration",
      "terminalProgressBarEnabled",
      "prefersReducedMotion",
      "spinnerTipsEnabled",
      "statusLine",
      "spinnerVerbs",
      "spinnerTipsOverride",
      "teammateMode",
      "fileSuggestion",
    ],
  },
  {
    id: "auth",
    label: "Authentication",
    keys: [
      "apiKeyHelper",
      "awsAuthRefresh",
      "awsCredentialExport",
      "otelHeadersHelper",
    ],
  },
]

export function getCategoryById(id: CategoryId): CategoryDef | undefined {
  return CONFIG_CATEGORIES.find((c) => c.id === id)
}

export const DEFAULT_CATEGORY: CategoryId = "general"
export const DEFAULT_SCOPE: ConfigScope = "user"

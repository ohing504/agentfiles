import { Minus, Plus, Save, Settings, Shield } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectLocalSettings, useSettings } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"

// ── Types ────────────────────────────────────────────────────────────────────

interface SettingRow {
  key: string
  value: string
}

// Keys managed by dedicated pages (MCP, Plugins)
const MANAGED_KEYS = ["mcpServers", "enabledPlugins"]

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── SharedSettingsCard (Editable key-value) ──────────────────────────────────

function SharedSettingsCard({
  settings,
  onSave,
  isPending,
}: {
  settings: Record<string, unknown>
  onSave: (updated: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [rows, setRows] = useState<SettingRow[]>([])
  const [dirty, setDirty] = useState(false)

  // Sync from settings when data changes externally
  useEffect(() => {
    const editableEntries = Object.entries(settings).filter(
      ([key]) => !MANAGED_KEYS.includes(key),
    )
    setRows(
      editableEntries.map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
    )
    setDirty(false)
  }, [settings])

  const handleKeyChange = (index: number, newKey: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, key: newKey } : row)),
    )
    setDirty(true)
  }

  const handleValueChange = (index: number, newValue: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, value: newValue } : row)),
    )
    setDirty(true)
  }

  const handleAdd = () => {
    setRows((prev) => [...prev, { key: "", value: "" }])
    setDirty(true)
  }

  const handleRemove = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  const handleSave = () => {
    // Preserve managed keys from original settings
    const updated: Record<string, unknown> = {}
    for (const key of MANAGED_KEYS) {
      if (key in settings) {
        updated[key] = settings[key]
      }
    }
    // Add edited rows
    for (const row of rows) {
      if (row.key.trim()) {
        // Try to parse JSON values (numbers, booleans, objects, arrays)
        try {
          updated[row.key.trim()] = JSON.parse(row.value)
        } catch {
          updated[row.key.trim()] = row.value
        }
      }
    }
    onSave(updated)
    setDirty(false)
  }

  const hasEditableSettings = rows.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_shared()}</CardTitle>
        <CardDescription>.claude/settings.json</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasEditableSettings && !dirty && (
          <p className="text-sm text-muted-foreground">
            No project-specific settings configured
          </p>
        )}

        {rows.map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: settings row list
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={m.settings_key()}
              value={row.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={m.settings_value()}
              value={row.value}
              onChange={(e) => handleValueChange(index, e.target.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(index)}
              aria-label={m.settings_remove()}
            >
              <Minus className="w-3 h-3" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="w-3 h-3" />
            {m.settings_add()}
          </Button>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save className="w-3 h-3" />
              {m.editor_save()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── PermissionsCard (Read-only) ─────────────────────────────────────────────

function PermissionsCard({
  localSettings,
}: {
  localSettings: Record<string, unknown> | undefined
}) {
  const allowRules = (localSettings?.allow as string[]) ?? []
  const denyRules = (localSettings?.deny as string[]) ?? []
  const hasRules = allowRules.length > 0 || denyRules.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          {m.settings_permissions()}
        </CardTitle>
        <CardDescription>
          {m.settings_local()}
          <Badge variant="outline" className="ml-2 text-xs">
            read-only
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasRules ? (
          <p className="text-sm text-muted-foreground">
            No permission rules configured
          </p>
        ) : (
          <div className="space-y-3">
            {allowRules.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Allow
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allowRules.map((rule) => (
                    <Badge
                      key={rule}
                      variant="default"
                      className="text-xs font-mono"
                    >
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {denyRules.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deny
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {denyRules.map((rule) => (
                    <Badge
                      key={rule}
                      variant="destructive"
                      className="text-xs font-mono"
                    >
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── ProjectSettingsContent ──────────────────────────────────────────────────

function ProjectSettingsContent() {
  const { query: settingsQuery, mutation } = useSettings("project")
  const { data: localSettings } = useProjectLocalSettings()

  const settings = settingsQuery.data ?? {}

  const handleSave = useCallback(
    (updated: Record<string, unknown>) => {
      mutation.mutate(updated)
    },
    [mutation],
  )

  if (settingsQuery.isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-8">
      {/* Section 1: .claude/settings.json (Editable) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">settings.json</h2>
        <SharedSettingsCard
          settings={settings}
          onSave={handleSave}
          isPending={mutation.isPending}
        />
      </section>

      {/* Section 2: .claude/settings.local.json (Read-only) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">
          settings.local.json
        </h2>
        <PermissionsCard localSettings={localSettings} />
      </section>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ProjectSettingsPage() {
  const { activeProjectPath } = useProjectContext()

  if (!activeProjectPath) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Settings className="w-10 h-10" />
        <p className="text-sm">{m.settings_no_project()}</p>
      </div>
    )
  }

  return <ProjectSettingsContent />
}

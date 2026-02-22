import { ChevronDown, Minus, Plus, Save, Settings2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useClaudeAppJson, useSettings } from "@/hooks/use-config"
import { m } from "@/paraglide/messages"

// ── Types ────────────────────────────────────────────────────────────────────

interface ToggleField {
  key: string
  label: string
}

interface EnvRow {
  key: string
  value: string
}

interface StatusLine {
  type: string
  command: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const MODEL_OPTIONS = ["opus", "sonnet", "haiku"] as const

const TOGGLE_FIELDS: ToggleField[] = [
  { key: "alwaysThinkingEnabled", label: "Always Thinking" },
  {
    key: "skipDangerousModePermissionPrompt",
    label: "Skip Dangerous Mode Prompt",
  },
  {
    key: "enableAllProjectMcpServers",
    label: "Enable All Project MCP Servers",
  },
]

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
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
    </div>
  )
}

// ── GeneralCard ──────────────────────────────────────────────────────────────

function GeneralCard({
  settings,
  onToggle,
  onModelChange,
}: {
  settings: Record<string, unknown>
  onToggle: (key: string, checked: boolean) => void
  onModelChange: (model: string) => void
}) {
  const currentModel = (settings.model as string) ?? "sonnet"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          {m.settings_general()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Select */}
        <div className="flex items-center justify-between">
          <Label>{m.settings_model()}</Label>
          <Select value={currentModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Fields */}
        {TOGGLE_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Switch
              id={field.key}
              checked={(settings[field.key] as boolean) ?? false}
              onCheckedChange={(checked: boolean) =>
                onToggle(field.key, checked)
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── EnvCard ──────────────────────────────────────────────────────────────────

function EnvCard({
  settings,
  onSave,
}: {
  settings: Record<string, unknown>
  onSave: (key: string, value: unknown) => void
}) {
  const [rows, setRows] = useState<EnvRow[]>([])
  const [dirty, setDirty] = useState(false)

  // Sync from settings when data changes externally
  useEffect(() => {
    const env = (settings.env as Record<string, string>) ?? {}
    setRows(Object.entries(env).map(([key, value]) => ({ key, value })))
    setDirty(false)
  }, [settings.env])

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
    const env: Record<string, string> = {}
    for (const row of rows) {
      if (row.key.trim()) {
        env[row.key.trim()] = row.value
      }
    }
    onSave("env", env)
    setDirty(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_env()}</CardTitle>
        <CardDescription>
          {m.settings_key()} / {m.settings_value()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: env row list
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
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3 h-3" />
              {m.editor_save()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── StatusLineCard ───────────────────────────────────────────────────────────

function StatusLineCard({
  settings,
  onSave,
}: {
  settings: Record<string, unknown>
  onSave: (key: string, value: unknown) => void
}) {
  const [statusLine, setStatusLine] = useState<StatusLine>({
    type: "",
    command: "",
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const sl = settings.statusLine as
      | { type?: string; command?: string }
      | undefined
    setStatusLine({
      type: sl?.type ?? "",
      command: sl?.command ?? "",
    })
    setDirty(false)
  }, [settings.statusLine])

  const handleChange = (field: keyof StatusLine, value: string) => {
    setStatusLine((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    const value: Record<string, string> = {}
    if (statusLine.type.trim()) value.type = statusLine.type.trim()
    if (statusLine.command.trim()) value.command = statusLine.command.trim()
    onSave("statusLine", Object.keys(value).length > 0 ? value : undefined)
    setDirty(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_status_line()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0">type</Label>
          <Input
            value={statusLine.type}
            onChange={(e) => handleChange("type", e.target.value)}
            placeholder="e.g. shell"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0">command</Label>
          <Input
            value={statusLine.command}
            onChange={(e) => handleChange("command", e.target.value)}
            placeholder="e.g. git branch --show-current"
          />
        </div>
        {dirty && (
          <div className="pt-1">
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3 h-3" />
              {m.editor_save()}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── InstallInfoCard ──────────────────────────────────────────────────────────

function InstallInfoCard({
  data,
}: {
  data: Record<string, unknown> | undefined
}) {
  if (!data) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_install_info()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">installMethod</span>
          <span className="text-sm font-mono">
            {(data.installMethod as string) ?? "unknown"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">numStartups</span>
          <span className="text-sm font-mono">
            {(data.numStartups as number) ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">autoUpdates</span>
          <Badge variant={data.autoUpdates ? "default" : "secondary"}>
            {data.autoUpdates ? m.settings_on() : m.settings_off()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ── FeatureFlagsCard ─────────────────────────────────────────────────────────

function FeatureFlagsCard({
  data,
}: {
  data: Record<string, unknown> | undefined
}) {
  if (!data) return null

  const gates = (data.cachedStatsigGates as Record<string, boolean>) ?? {}
  const entries = Object.entries(gates)

  if (entries.length === 0) return null

  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              {m.settings_feature_flags()}
              <Badge variant="secondary" className="text-xs">
                {entries.length}
              </Badge>
            </CardTitle>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {entries.map(([name, enabled]) => (
                <Badge
                  key={name}
                  variant={enabled ? "default" : "outline"}
                  className="text-xs font-mono"
                >
                  {name.replace(/^statsig:/, "")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function GlobalSettingsPage() {
  const { query: settingsQuery, mutation } = useSettings("global")
  const { data: claudeAppJson, isLoading: claudeLoading } = useClaudeAppJson()

  const settings = settingsQuery.data ?? {}

  const handleSave = useCallback(
    (key: string, value: unknown) => {
      const current = settingsQuery.data ?? {}
      mutation.mutate({ ...current, [key]: value })
    },
    [settingsQuery.data, mutation],
  )

  const handleToggle = useCallback(
    (key: string, checked: boolean) => {
      const current = settingsQuery.data ?? {}
      mutation.mutate({ ...current, [key]: checked })
    },
    [settingsQuery.data, mutation],
  )

  const handleModelChange = useCallback(
    (model: string) => {
      const current = settingsQuery.data ?? {}
      mutation.mutate({ ...current, model })
    },
    [settingsQuery.data, mutation],
  )

  if (settingsQuery.isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-8">
      {/* Section 1: settings.json (Editable) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">settings.json</h2>
        <GeneralCard
          settings={settings}
          onToggle={handleToggle}
          onModelChange={handleModelChange}
        />
        <EnvCard settings={settings} onSave={handleSave} />
        <StatusLineCard settings={settings} onSave={handleSave} />
      </section>

      {/* Section 2: ~/.claude.json (Read-only) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">
          ~/.claude.json
          <Badge variant="outline" className="ml-2 text-xs">
            read-only
          </Badge>
        </h2>
        {claudeLoading ? (
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ) : (
          <>
            <InstallInfoCard data={claudeAppJson} />
            <FeatureFlagsCard data={claudeAppJson} />
          </>
        )}
      </section>
    </div>
  )
}

import { SaveIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

interface StatusLine {
  type: string
  command: string
}

function StatusLineEditor({
  settings,
  onUpdate,
  isPending,
}: {
  settings: Record<string, unknown>
  onUpdate: (key: string, value: unknown) => void
  isPending: boolean
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
    setStatusLine({ type: sl?.type ?? "", command: sl?.command ?? "" })
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
    onUpdate("statusLine", Object.keys(value).length > 0 ? value : undefined)
    setDirty(false)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Status Line</h3>
      <div className="flex items-center gap-2">
        <Label className="w-20 shrink-0">type</Label>
        <Input
          value={statusLine.type}
          onChange={(e) => handleChange("type", e.target.value)}
          placeholder="e.g. shell"
          disabled={isPending}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 shrink-0">command</Label>
        <Input
          value={statusLine.command}
          onChange={(e) => handleChange("command", e.target.value)}
          placeholder="e.g. git branch --show-current"
          disabled={isPending}
        />
      </div>
      {dirty && (
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          <SaveIcon className="w-3 h-3" />
          Save
        </Button>
      )}
    </div>
  )
}

function JsonTextareaField({
  label,
  settingKey,
  value,
  onUpdate,
  isPending,
}: {
  label: string
  settingKey: string
  value: unknown
  onUpdate: (key: string, value: unknown) => void
  isPending: boolean
}) {
  const [text, setText] = useState(
    value !== undefined ? JSON.stringify(value, null, 2) : "",
  )
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(value !== undefined ? JSON.stringify(value, null, 2) : "")
    setDirty(false)
    setError(null)
  }, [value])

  const handleChange = (v: string) => {
    setText(v)
    setDirty(true)
    setError(null)
  }

  const handleSave = () => {
    try {
      const parsed = text.trim() ? JSON.parse(text) : undefined
      onUpdate(settingKey, parsed)
      setDirty(false)
      setError(null)
    } catch {
      setError("Invalid JSON")
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="{}"
        className="font-mono text-xs min-h-24"
        disabled={isPending}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {dirty && (
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          <SaveIcon className="w-3 h-3" />
          Save
        </Button>
      )}
    </div>
  )
}

export function DisplaySettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="showTurnDuration">Show Turn Duration</Label>
          <Switch
            id="showTurnDuration"
            checked={(settings.showTurnDuration as boolean) ?? true}
            onCheckedChange={(v) => onUpdate("showTurnDuration", v)}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="terminalProgressBarEnabled">
            Terminal Progress Bar
          </Label>
          <Switch
            id="terminalProgressBarEnabled"
            checked={(settings.terminalProgressBarEnabled as boolean) ?? true}
            onCheckedChange={(v) => onUpdate("terminalProgressBarEnabled", v)}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="prefersReducedMotion">Prefers Reduced Motion</Label>
          <Switch
            id="prefersReducedMotion"
            checked={(settings.prefersReducedMotion as boolean) ?? false}
            onCheckedChange={(v) => onUpdate("prefersReducedMotion", v)}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="spinnerTipsEnabled">Spinner Tips</Label>
          <Switch
            id="spinnerTipsEnabled"
            checked={(settings.spinnerTipsEnabled as boolean) ?? true}
            onCheckedChange={(v) => onUpdate("spinnerTipsEnabled", v)}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Teammate Mode */}
      <div className="flex items-center justify-between">
        <Label>Teammate Mode</Label>
        <Select
          value={(settings.teammateMode as string) ?? "auto"}
          onValueChange={(v) => onUpdate("teammateMode", v)}
          disabled={isPending}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">auto</SelectItem>
            <SelectItem value="in-process">in-process</SelectItem>
            <SelectItem value="tmux">tmux</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Line */}
      <StatusLineEditor
        settings={settings}
        onUpdate={onUpdate}
        isPending={isPending}
      />

      {/* Complex JSON fields */}
      <JsonTextareaField
        label="Spinner Verbs (JSON)"
        settingKey="spinnerVerbs"
        value={settings.spinnerVerbs}
        onUpdate={onUpdate}
        isPending={isPending}
      />

      <JsonTextareaField
        label="Spinner Tips Override (JSON)"
        settingKey="spinnerTipsOverride"
        value={settings.spinnerTipsOverride}
        onUpdate={onUpdate}
        isPending={isPending}
      />

      <JsonTextareaField
        label="File Suggestion (JSON)"
        settingKey="fileSuggestion"
        value={settings.fileSuggestion}
        onUpdate={onUpdate}
        isPending={isPending}
      />
    </div>
  )
}

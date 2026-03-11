import { MinusIcon, PlusIcon, SaveIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

interface EnvRow {
  key: string
  value: string
}

export function EnvironmentSettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  const [rows, setRows] = useState<EnvRow[]>([])
  const [dirty, setDirty] = useState(false)

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
    onUpdate("env", env)
    setDirty(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.length > 0 && (
          <div className="flex gap-2 text-xs text-muted-foreground px-1">
            <span className="flex-1">Key</span>
            <span className="flex-1">Value</span>
            <span className="w-8" />
          </div>
        )}
        {rows.map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: env row list
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="KEY"
              value={row.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              className="flex-1 font-mono text-sm"
              disabled={isPending}
            />
            <Input
              placeholder="value"
              value={row.value}
              onChange={(e) => handleValueChange(index, e.target.value)}
              className="flex-1 font-mono text-sm"
              disabled={isPending}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(index)}
              disabled={isPending}
              aria-label="Remove row"
            >
              <MinusIcon className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No environment variables configured.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending}
        >
          <PlusIcon className="w-3 h-3" />
          Add
        </Button>
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <SaveIcon className="w-3 h-3" />
            Save
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Changes are applied after clicking Save.
      </p>
    </div>
  )
}

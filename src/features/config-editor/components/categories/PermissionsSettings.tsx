import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
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
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

interface Permissions {
  allow?: string[]
  ask?: string[]
  deny?: string[]
  additionalDirectories?: string[]
  defaultMode?: string
  disableBypassPermissionsMode?: string
}

function TagInput({
  label,
  items,
  badgeVariant,
  onAdd,
  onRemove,
  isPending,
}: {
  label: string
  items: string[]
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  isPending: boolean
}) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed || items.includes(trimmed)) return
    onAdd(trimmed)
    setInput("")
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant={badgeVariant} className="gap-1">
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              disabled={isPending}
              aria-label={`Remove ${item}`}
              className="ml-0.5 hover:opacity-70"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add entry..."
          className="flex-1"
          disabled={isPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
        >
          <PlusIcon className="w-3 h-3" />
          Add
        </Button>
      </div>
    </div>
  )
}

export function PermissionsSettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  const perms = (settings.permissions as Permissions) ?? {}

  const savePerms = (patch: Partial<Permissions>) => {
    onUpdate("permissions", { ...perms, ...patch })
  }

  return (
    <div className="space-y-6">
      <TagInput
        label="Allow"
        items={perms.allow ?? []}
        badgeVariant="default"
        onAdd={(v) => savePerms({ allow: [...(perms.allow ?? []), v] })}
        onRemove={(v) =>
          savePerms({ allow: (perms.allow ?? []).filter((x) => x !== v) })
        }
        isPending={isPending}
      />

      <TagInput
        label="Ask"
        items={perms.ask ?? []}
        badgeVariant="secondary"
        onAdd={(v) => savePerms({ ask: [...(perms.ask ?? []), v] })}
        onRemove={(v) =>
          savePerms({ ask: (perms.ask ?? []).filter((x) => x !== v) })
        }
        isPending={isPending}
      />

      <TagInput
        label="Deny"
        items={perms.deny ?? []}
        badgeVariant="destructive"
        onAdd={(v) => savePerms({ deny: [...(perms.deny ?? []), v] })}
        onRemove={(v) =>
          savePerms({ deny: (perms.deny ?? []).filter((x) => x !== v) })
        }
        isPending={isPending}
      />

      <TagInput
        label="Additional Directories"
        items={perms.additionalDirectories ?? []}
        badgeVariant="outline"
        onAdd={(v) =>
          savePerms({
            additionalDirectories: [...(perms.additionalDirectories ?? []), v],
          })
        }
        onRemove={(v) =>
          savePerms({
            additionalDirectories: (perms.additionalDirectories ?? []).filter(
              (x) => x !== v,
            ),
          })
        }
        isPending={isPending}
      />

      <div className="flex items-center justify-between">
        <Label>Default Mode</Label>
        <Select
          value={perms.defaultMode ?? "default"}
          onValueChange={(v) => savePerms({ defaultMode: v })}
          disabled={isPending}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">default</SelectItem>
            <SelectItem value="acceptEdits">acceptEdits</SelectItem>
            <SelectItem value="plan">plan</SelectItem>
            <SelectItem value="dontAsk">dontAsk</SelectItem>
            <SelectItem value="bypassPermissions">bypassPermissions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Disable Bypass Permissions Mode</Label>
        <Select
          value={perms.disableBypassPermissionsMode ?? ""}
          onValueChange={(v) => savePerms({ disableBypassPermissionsMode: v })}
          disabled={isPending}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="(none)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">—</SelectItem>
            <SelectItem value="disable">disable</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

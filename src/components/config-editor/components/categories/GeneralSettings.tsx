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
import { Switch } from "@/components/ui/switch"
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

export function GeneralSettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  const [newModel, setNewModel] = useState("")

  const model = (settings.model as string) ?? "sonnet"
  const availableModels = (settings.availableModels as string[]) ?? []
  const language = (settings.language as string) ?? ""
  const outputStyle = (settings.outputStyle as string) ?? ""
  const alwaysThinkingEnabled =
    (settings.alwaysThinkingEnabled as boolean) ?? false
  const cleanupPeriodDays = (settings.cleanupPeriodDays as number) ?? ""
  const autoUpdatesChannel = (settings.autoUpdatesChannel as string) ?? "stable"
  const plansDirectory = (settings.plansDirectory as string) ?? ""
  const attribution =
    (settings.attribution as {
      gitCommit?: boolean
      pullRequest?: boolean
    }) ?? {}
  const respectGitignore = (settings.respectGitignore as boolean) ?? true

  const handleAddModel = () => {
    const trimmed = newModel.trim()
    if (!trimmed || availableModels.includes(trimmed)) return
    onUpdate("availableModels", [...availableModels, trimmed])
    setNewModel("")
  }

  const handleRemoveModel = (m: string) => {
    onUpdate(
      "availableModels",
      availableModels.filter((x) => x !== m),
    )
  }

  return (
    <div className="space-y-6">
      {/* Model */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Model</Label>
          <Select
            value={model}
            onValueChange={(v) => onUpdate("model", v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opus">opus</SelectItem>
              <SelectItem value="sonnet">sonnet</SelectItem>
              <SelectItem value="haiku">haiku</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Available Models */}
        <div className="space-y-2">
          <Label>Available Models</Label>
          <div className="flex flex-wrap gap-1.5">
            {availableModels.map((m) => (
              <Badge key={m} variant="secondary" className="gap-1">
                {m}
                <button
                  type="button"
                  onClick={() => handleRemoveModel(m)}
                  disabled={isPending}
                  aria-label={`Remove ${m}`}
                  className="ml-0.5 hover:text-destructive"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
              placeholder="e.g. claude-opus-4-6"
              className="flex-1"
              disabled={isPending}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddModel}
              disabled={isPending || !newModel.trim()}
            >
              <PlusIcon className="w-3 h-3" />
              Add
            </Button>
          </div>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between">
          <Label>Language</Label>
          <Input
            value={language}
            onChange={(e) => onUpdate("language", e.target.value)}
            placeholder="e.g. en"
            className="w-36"
            disabled={isPending}
          />
        </div>

        {/* Output Style */}
        <div className="flex items-center justify-between">
          <Label>Output Style</Label>
          <Input
            value={outputStyle}
            onChange={(e) => onUpdate("outputStyle", e.target.value)}
            placeholder="e.g. default"
            className="w-36"
            disabled={isPending}
          />
        </div>

        {/* Always Thinking */}
        <div className="flex items-center justify-between">
          <Label htmlFor="alwaysThinkingEnabled">Always Thinking</Label>
          <Switch
            id="alwaysThinkingEnabled"
            checked={alwaysThinkingEnabled}
            onCheckedChange={(v) => onUpdate("alwaysThinkingEnabled", v)}
            disabled={isPending}
          />
        </div>

        {/* Cleanup Period */}
        <div className="flex items-center justify-between">
          <Label>Cleanup Period (days)</Label>
          <Input
            type="number"
            value={cleanupPeriodDays}
            onChange={(e) =>
              onUpdate(
                "cleanupPeriodDays",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="e.g. 30"
            className="w-36"
            disabled={isPending}
          />
        </div>

        {/* Auto Updates Channel */}
        <div className="flex items-center justify-between">
          <Label>Auto Updates Channel</Label>
          <Select
            value={autoUpdatesChannel}
            onValueChange={(v) => onUpdate("autoUpdatesChannel", v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">stable</SelectItem>
              <SelectItem value="latest">latest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Plans Directory */}
        <div className="flex items-center justify-between">
          <Label>Plans Directory</Label>
          <Input
            value={plansDirectory}
            onChange={(e) => onUpdate("plansDirectory", e.target.value)}
            placeholder="e.g. .omc/plans"
            className="w-36"
            disabled={isPending}
          />
        </div>

        {/* Respect Gitignore */}
        <div className="flex items-center justify-between">
          <Label htmlFor="respectGitignore">Respect Gitignore</Label>
          <Switch
            id="respectGitignore"
            checked={respectGitignore}
            onCheckedChange={(v) => onUpdate("respectGitignore", v)}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Attribution */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Attribution</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="attribution-gitCommit">Git Commit</Label>
          <Switch
            id="attribution-gitCommit"
            checked={attribution.gitCommit ?? false}
            onCheckedChange={(v) =>
              onUpdate("attribution", { ...attribution, gitCommit: v })
            }
            disabled={isPending}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="attribution-pullRequest">Pull Request</Label>
          <Switch
            id="attribution-pullRequest"
            checked={attribution.pullRequest ?? false}
            onCheckedChange={(v) =>
              onUpdate("attribution", { ...attribution, pullRequest: v })
            }
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  )
}

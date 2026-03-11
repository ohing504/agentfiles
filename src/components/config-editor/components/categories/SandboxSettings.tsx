import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CategorySettingsProps } from "../ConfigSettingsPanel"

interface SandboxNetwork {
  allowedDomains?: string[]
  allowLocalBinding?: boolean
  allowAllUnixSockets?: boolean
  allowUnixSockets?: string[]
  httpProxyPort?: number
  socksProxyPort?: number
}

interface Sandbox {
  enabled?: boolean
  autoAllowBashIfSandboxed?: boolean
  excludedCommands?: string[]
  allowUnsandboxedCommands?: boolean
  enableWeakerNestedSandbox?: boolean
  network?: SandboxNetwork
}

function StringTagInput({
  items,
  onAdd,
  onRemove,
  isPending,
  placeholder,
}: {
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  isPending: boolean
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed || items.includes(trimmed)) return
    onAdd(trimmed)
    setInput("")
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="gap-1 font-mono text-xs"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              disabled={isPending}
              aria-label={`Remove ${item}`}
              className="ml-0.5 hover:text-destructive"
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
          placeholder={placeholder ?? "Add entry..."}
          className="flex-1 font-mono text-sm"
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

export function SandboxSettings({
  settings,
  onUpdate,
  isPending,
}: CategorySettingsProps) {
  const sandbox = (settings.sandbox as Sandbox) ?? {}
  const network = sandbox.network ?? {}

  const saveSandbox = (patch: Partial<Sandbox>) => {
    onUpdate("sandbox", { ...sandbox, ...patch })
  }

  const saveNetwork = (patch: Partial<SandboxNetwork>) => {
    onUpdate("sandbox", { ...sandbox, network: { ...network, ...patch } })
  }

  return (
    <div className="space-y-6">
      {/* General */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">General</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="sandbox-enabled">Enabled</Label>
          <Switch
            id="sandbox-enabled"
            checked={sandbox.enabled ?? false}
            onCheckedChange={(v) => saveSandbox({ enabled: v })}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sandbox-autoAllow">
            Auto Allow Bash If Sandboxed
          </Label>
          <Switch
            id="sandbox-autoAllow"
            checked={sandbox.autoAllowBashIfSandboxed ?? false}
            onCheckedChange={(v) =>
              saveSandbox({ autoAllowBashIfSandboxed: v })
            }
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sandbox-allowUnsandboxed">
            Allow Unsandboxed Commands
          </Label>
          <Switch
            id="sandbox-allowUnsandboxed"
            checked={sandbox.allowUnsandboxedCommands ?? false}
            onCheckedChange={(v) =>
              saveSandbox({ allowUnsandboxedCommands: v })
            }
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sandbox-weakerNested">
            Enable Weaker Nested Sandbox
          </Label>
          <Switch
            id="sandbox-weakerNested"
            checked={sandbox.enableWeakerNestedSandbox ?? false}
            onCheckedChange={(v) =>
              saveSandbox({ enableWeakerNestedSandbox: v })
            }
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Excluded Commands</Label>
          <StringTagInput
            items={sandbox.excludedCommands ?? []}
            onAdd={(v) =>
              saveSandbox({
                excludedCommands: [...(sandbox.excludedCommands ?? []), v],
              })
            }
            onRemove={(v) =>
              saveSandbox({
                excludedCommands: (sandbox.excludedCommands ?? []).filter(
                  (x) => x !== v,
                ),
              })
            }
            isPending={isPending}
            placeholder="e.g. curl"
          />
        </div>
      </div>

      {/* Network */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Network</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="net-allowLocal">Allow Local Binding</Label>
          <Switch
            id="net-allowLocal"
            checked={network.allowLocalBinding ?? false}
            onCheckedChange={(v) => saveNetwork({ allowLocalBinding: v })}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="net-allowAllUnix">Allow All Unix Sockets</Label>
          <Switch
            id="net-allowAllUnix"
            checked={network.allowAllUnixSockets ?? false}
            onCheckedChange={(v) => saveNetwork({ allowAllUnixSockets: v })}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>HTTP Proxy Port</Label>
          <Input
            type="number"
            value={network.httpProxyPort ?? ""}
            onChange={(e) =>
              saveNetwork({
                httpProxyPort: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="e.g. 8080"
            className="w-28"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>SOCKS Proxy Port</Label>
          <Input
            type="number"
            value={network.socksProxyPort ?? ""}
            onChange={(e) =>
              saveNetwork({
                socksProxyPort: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="e.g. 1080"
            className="w-28"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Allowed Domains</Label>
          <StringTagInput
            items={network.allowedDomains ?? []}
            onAdd={(v) =>
              saveNetwork({
                allowedDomains: [...(network.allowedDomains ?? []), v],
              })
            }
            onRemove={(v) =>
              saveNetwork({
                allowedDomains: (network.allowedDomains ?? []).filter(
                  (x) => x !== v,
                ),
              })
            }
            isPending={isPending}
            placeholder="e.g. api.example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Allow Unix Sockets</Label>
          <StringTagInput
            items={network.allowUnixSockets ?? []}
            onAdd={(v) =>
              saveNetwork({
                allowUnixSockets: [...(network.allowUnixSockets ?? []), v],
              })
            }
            onRemove={(v) =>
              saveNetwork({
                allowUnixSockets: (network.allowUnixSockets ?? []).filter(
                  (x) => x !== v,
                ),
              })
            }
            isPending={isPending}
            placeholder="e.g. /var/run/docker.sock"
          />
        </div>
      </div>
    </div>
  )
}

import { Link } from "@tanstack/react-router"
import { SettingsIcon } from "lucide-react"
import { useAgentContext } from "@/components/AgentContext"
import { ClaudeIcon } from "@/components/icons/agent-icons"
import { ProjectSwitcher } from "@/components/ProjectSwitcher"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AgentType } from "@/shared/types"

const AGENT_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  "claude-code": ClaudeIcon,
}

export function AppHeader() {
  const { mainAgent, installedAgents, setMainAgent } = useAgentContext()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex items-center gap-2">
        <ProjectSwitcher />
        <Select
          value={mainAgent}
          onValueChange={(value) => setMainAgent(value as AgentType)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {installedAgents.map((agent) => {
              const Icon = AGENT_ICONS[agent.name]
              return (
                <SelectItem key={agent.name} value={agent.name}>
                  <span className="flex items-center gap-1.5">
                    {Icon && <Icon className="size-3.5" />}
                    {agent.displayName}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <SettingsIcon className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </header>
  )
}

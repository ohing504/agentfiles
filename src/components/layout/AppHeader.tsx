import { Link } from "@tanstack/react-router"
import { SettingsIcon } from "lucide-react"
import { ProjectSwitcher } from "@/components/ProjectSwitcher"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
      <ProjectSwitcher />
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

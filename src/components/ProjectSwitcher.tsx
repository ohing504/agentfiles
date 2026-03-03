import { Check, ChevronsUpDown, FolderOpen, Globe, Plus } from "lucide-react"
import { useState } from "react"
import { AddProjectDialog } from "@/components/AddProjectDialog"
import { useProjectContext } from "@/components/ProjectContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { shortenPath } from "@/lib/format"

export function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject, homedir } =
    useProjectContext()
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-2 px-2 h-9 data-[state=open]:bg-accent"
          >
            <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderOpen className="size-3.5" />
            </div>
            <div className="grid text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {activeProject?.name ?? "User Only"}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {activeProject
                  ? shortenPath(activeProject.path, homedir)
                  : "~/.claude"}
              </span>
            </div>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuItem
            onClick={() => setActiveProject(null)}
            className="gap-2 p-2"
          >
            <Globe className="size-4 shrink-0" />
            <span>User Only</span>
            {!activeProject && <Check className="size-4 ml-auto shrink-0" />}
          </DropdownMenuItem>

          {projects.length > 0 && <DropdownMenuSeparator />}

          {[...projects]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => (
              <DropdownMenuItem
                key={project.path}
                onClick={() => setActiveProject(project.path)}
                className="gap-2 p-2"
              >
                <FolderOpen className="size-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {shortenPath(project.path, homedir)}
                  </div>
                </div>
                {activeProject?.path === project.path && (
                  <Check className="size-4 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowAddDialog(true)}
            className="gap-2 p-2"
          >
            <Plus className="size-4 shrink-0" />
            <span>Add Project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddProjectDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  )
}

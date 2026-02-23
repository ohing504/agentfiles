import { Check, ChevronsUpDown, FolderOpen, Globe, Plus } from "lucide-react"
import { useState } from "react"
import { AddProjectDialog } from "@/components/AddProjectDialog"
import { useProjectContext } from "@/components/ProjectContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { shortenPath } from "@/lib/format"

export function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject, homedir } =
    useProjectContext()
  const { isMobile } = useSidebar()
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FolderOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeProject?.name ?? "Global Only"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeProject
                      ? shortenPath(activeProject.path, homedir)
                      : "~/.claude"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              {projects.map((project) => (
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

              {projects.length > 0 && <DropdownMenuSeparator />}

              <DropdownMenuItem
                onClick={() => setActiveProject(null)}
                className="gap-2 p-2"
              >
                <Globe className="size-4 shrink-0" />
                <span>Global Only</span>
                {!activeProject && (
                  <Check className="size-4 ml-auto shrink-0" />
                )}
              </DropdownMenuItem>

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
        </SidebarMenuItem>
      </SidebarMenu>

      <AddProjectDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  )
}

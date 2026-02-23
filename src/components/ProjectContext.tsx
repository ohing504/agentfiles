import { createContext, useContext } from "react"
import { useProjects } from "@/hooks/use-projects"
import type { Project } from "@/shared/types"

interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null
  activeProjectPath: string | undefined
  homedir: string
  isLoading: boolean
  setActiveProject: (path: string | null) => void
  addProject: (path: string) => Promise<void>
  removeProject: (path: string) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { query, addMutation, removeMutation, setActiveMutation } =
    useProjects()

  const projects = query.data?.projects ?? []
  const activeProjectPath = query.data?.activeProject ?? undefined
  const homedir = query.data?.homedir ?? ""
  const activeProject =
    projects.find((p) => p.path === activeProjectPath) ?? null

  const value: ProjectContextValue = {
    projects,
    activeProject,
    activeProjectPath,
    homedir,
    isLoading: query.isLoading,
    setActiveProject: (path) => setActiveMutation.mutate(path),
    addProject: async (path) => {
      await addMutation.mutateAsync(path)
    },
    removeProject: (path) => removeMutation.mutate(path),
  }

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  )
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider")
  }
  return context
}

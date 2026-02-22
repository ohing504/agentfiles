import {
  AlertCircle,
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import { useProjectContext } from "@/components/ProjectContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function useBrowseDir() {
  const [currentPath, setCurrentPath] = useState("")
  const [parent, setParent] = useState("")
  const [dirs, setDirs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const browse = async (path?: string) => {
    setIsLoading(true)
    try {
      const { browseDirFn } = await import("@/server/projects")
      const result = await browseDirFn({ data: { path } })
      setCurrentPath(result.current)
      setParent(result.parent)
      setDirs(result.dirs)
    } finally {
      setIsLoading(false)
    }
  }

  return { currentPath, parent, dirs, isLoading, browse }
}

export function AddProjectDialog({
  open,
  onOpenChange,
}: AddProjectDialogProps) {
  const { addProject } = useProjectContext()
  const [path, setPath] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const { currentPath, parent, dirs, isLoading, browse } = useBrowseDir()

  const handleAdd = async () => {
    if (!path.trim()) return
    setError(null)
    setIsAdding(true)
    try {
      await addProject(path.trim())
      setPath("")
      setIsBrowsing(false)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project")
    } finally {
      setIsAdding(false)
    }
  }

  const handleBrowseTo = (dirPath: string) => {
    browse(dirPath)
    setPath(dirPath)
    setError(null)
  }

  const handleSelectSubdir = (dirName: string) => {
    const newPath =
      currentPath === "/" ? `/${dirName}` : `${currentPath}/${dirName}`
    handleBrowseTo(newPath)
  }

  const toggleBrowse = () => {
    if (!isBrowsing) {
      browse(path.trim() || undefined)
    }
    setIsBrowsing(!isBrowsing)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-path">Project Path</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value)
                  setError(null)
                }}
                placeholder="/Users/you/workspace/my-project"
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
              />
              <Button
                type="button"
                variant={isBrowsing ? "default" : "outline"}
                size="icon"
                onClick={toggleBrowse}
                title="Browse folders"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

          {isBrowsing && (
            <div className="border rounded-md">
              <div className="px-3 py-2 bg-muted/50 border-b">
                <span className="text-xs font-mono text-muted-foreground truncate block">
                  {currentPath}
                </span>
              </div>
              <ScrollArea className="h-[200px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : dirs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No subdirectories
                  </div>
                ) : (
                  <div className="p-1">
                    {currentPath !== parent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBrowseTo(parent)}
                        className="w-full justify-start gap-2 text-muted-foreground"
                      >
                        <ChevronRight className="size-3 rotate-180" />
                        <span>..</span>
                      </Button>
                    )}
                    {dirs.map((dir) => (
                      <Button
                        key={dir}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectSubdir(dir)}
                        className="w-full justify-start gap-2"
                      >
                        <Folder className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{dir}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!path.trim() || isAdding}>
            {isAdding && <Loader2 className="size-4 mr-2 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { AlertCircle, FolderOpen, Loader2 } from "lucide-react"
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

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProjectDialog({
  open,
  onOpenChange,
}: AddProjectDialogProps) {
  const { addProject } = useProjectContext()
  const [path, setPath] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!path.trim()) return
    setError(null)
    setIsAdding(true)
    try {
      addProject(path.trim())
      setPath("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project")
    } finally {
      setIsAdding(false)
    }
  }

  const handleFolderPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker()
        setPath(dirHandle.name)
      }
    } catch {
      // User cancelled or API not supported
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
                variant="outline"
                size="icon"
                onClick={handleFolderPicker}
                title="Browse folders"
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

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

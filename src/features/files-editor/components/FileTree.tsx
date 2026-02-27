import { FileIcon, FileJsonIcon, FileTextIcon, FolderIcon } from "lucide-react"
import { memo, useState } from "react"
import { ListItem, ListSubItem } from "@/components/ui/list-item"
import type { FileNode } from "../services/files-scanner.service"

function getFileIcon(extension?: string) {
  switch (extension) {
    case ".md":
      return FileTextIcon
    case ".json":
      return FileJsonIcon
    default:
      return FileIcon
  }
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  selectedPath,
  onSelect,
}: {
  node: FileNode
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(false)

  if (node.type === "directory") {
    return (
      <ListItem
        icon={FolderIcon}
        label={node.name}
        trailing={
          node.children?.length ? (
            <span className="text-[10px] text-muted-foreground">
              {node.children.length}
            </span>
          ) : undefined
        }
        open={open}
        onClick={() => setOpen(!open)}
      >
        {node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </ListItem>
    )
  }

  const Icon = getFileIcon(node.extension)

  return (
    <ListSubItem
      icon={Icon}
      label={node.name}
      selected={selectedPath === node.path}
      onClick={() => onSelect(node.path)}
    />
  )
})

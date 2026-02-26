import { FileIcon, FileJsonIcon, FileTextIcon, FolderIcon } from "lucide-react"
import { memo, useState } from "react"
import type { FileNode } from "../services/files-scanner.service"

interface FileTreeProps {
  root: FileNode
  selectedPath: string | null
  onSelect: (path: string) => void
}

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

const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 1)

  if (node.type === "directory") {
    return (
      <div>
        <button
          type="button"
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/50 rounded-sm transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setOpen(!open)}
        >
          <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    )
  }

  const Icon = getFileIcon(node.extension)
  const isSelected = selectedPath === node.path

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded-sm transition-colors ${
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50 text-foreground"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(node.path)}
    >
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  )
})

export const FileTree = memo(function FileTree({
  root,
  selectedPath,
  onSelect,
}: FileTreeProps) {
  if (!root.children || root.children.length === 0) {
    return null
  }

  return (
    <div className="py-1">
      {root.children.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          defaultOpen
        />
      ))}
    </div>
  )
})

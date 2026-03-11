import { FileIcon } from "lucide-react"
import type { DashboardDetailTarget } from "@/components/board/types"
import { FileDetailView } from "@/components/entity/FileDetailView"
import type { EntityConfig } from "@/config/entity-registry"

export interface FileItem {
  path: string
  name: string
}

function FileDetailContent({ item }: { item: FileItem }) {
  return <FileDetailView item={item} />
}

export const fileConfig: EntityConfig<FileItem> = {
  type: "file",
  icon: FileIcon,
  actions: ["open-vscode", "open-cursor"],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  DetailContent: FileDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "file",
    filePath: item.path,
  }),
}

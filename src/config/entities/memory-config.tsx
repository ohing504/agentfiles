import { FileTextIcon } from "lucide-react"
import type { DashboardDetailTarget } from "@/components/board/types"
import { MemoryDetailView } from "@/components/entity/MemoryDetailView"
import type { EntityConfig } from "@/config/entity-registry"
import type { MemoryFile } from "@/shared/types"

function MemoryDetailContent({ item }: { item: MemoryFile }) {
  return <MemoryDetailView item={item} />
}

export const memoryConfig: EntityConfig<MemoryFile> = {
  type: "memory",
  icon: FileTextIcon,
  actions: [],
  getKey: (item) => item.path,
  getLabel: (item) => item.name,
  DetailContent: MemoryDetailContent,
  toDetailTarget: (item): DashboardDetailTarget => ({
    type: "memory",
    file: item,
  }),
}

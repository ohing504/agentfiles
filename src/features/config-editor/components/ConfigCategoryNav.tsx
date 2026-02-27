import {
  KeyRoundIcon,
  LayoutIcon,
  LockIcon,
  SandwichIcon,
  SettingsIcon,
  TerminalIcon,
} from "lucide-react"
import type { ElementType } from "react"
import { memo } from "react"
import { ListItem } from "@/components/ui/list-item"
import { type CategoryId, CONFIG_CATEGORIES } from "../constants"

const CATEGORY_ICONS: Record<CategoryId, ElementType> = {
  general: SettingsIcon,
  permissions: LockIcon,
  environment: TerminalIcon,
  sandbox: SandwichIcon,
  display: LayoutIcon,
  auth: KeyRoundIcon,
}

interface ConfigCategoryNavProps {
  category: CategoryId
  onCategoryChange: (category: CategoryId) => void
}

export const ConfigCategoryNav = memo(function ConfigCategoryNav({
  category,
  onCategoryChange,
}: ConfigCategoryNavProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {CONFIG_CATEGORIES.map((cat) => (
        <ListItem
          key={cat.id}
          icon={CATEGORY_ICONS[cat.id]}
          label={cat.label}
          selected={category === cat.id}
          onClick={() => onCategoryChange(cat.id)}
        />
      ))}
    </nav>
  )
})

import { Check, Globe } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"

type Locale = (typeof locales)[number]

const localeLabels: Record<Locale, () => string> = {
  en: () => m.app_language_en(),
  ko: () => m.app_language_ko(),
}

export function LanguageSwitcher() {
  const currentLocale = getLocale()
  const currentLabel = localeLabels[currentLocale]?.() ?? currentLocale

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={currentLabel}>
              <Globe />
              <span>{currentLabel}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-40">
            {locales.map((locale) => {
              const isActive = locale === currentLocale
              return (
                <DropdownMenuItem
                  key={locale}
                  onClick={() => setLocale(locale)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="flex-1">
                    {localeLabels[locale]?.() ?? locale}
                  </span>
                  {isActive && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

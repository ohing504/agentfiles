import { Check, CheckCircle2, FolderOpen, XCircle } from "lucide-react"
import { useProjectContext } from "@/components/ProjectContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCliStatus } from "@/hooks/use-config"
import { shortenPath } from "@/lib/format"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"

type Locale = (typeof locales)[number]

const localeConfig: Record<Locale, { flag: string; full: string }> = {
  en: { flag: "\u{1F1FA}\u{1F1F8}", full: "English" },
  ko: { flag: "\u{1F1F0}\u{1F1F7}", full: "\uD55C\uAD6D\uC5B4" },
}

function StatusBarLanguage() {
  const currentLocale = getLocale()
  const config = localeConfig[currentLocale]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs hover:bg-accent/50 transition-colors"
        >
          <span>{config?.flag ?? currentLocale}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-40">
        {locales.map((locale) => {
          const isActive = locale === currentLocale
          const lc = localeConfig[locale]
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => setLocale(locale)}
              aria-current={isActive ? "true" : undefined}
            >
              <span>{lc?.flag}</span>
              <span className="flex-1">{lc?.full ?? locale}</span>
              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusBarCliVersion() {
  const { data: cliStatus, isLoading } = useCliStatus()

  if (isLoading || !cliStatus) return null

  return cliStatus.available ? (
    <div className="flex items-center gap-1 px-2 text-xs">
      <CheckCircle2 className="size-3 text-green-500" />
      <span>Claude CLI {cliStatus.version}</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 px-2 text-xs">
      <XCircle className="size-3 text-destructive" />
      <span>CLI unavailable</span>
    </div>
  )
}

export function StatusBar() {
  const { activeProject, homedir } = useProjectContext()

  return (
    <footer className="relative z-20 flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 text-xs text-muted-foreground">
      {/* Left */}
      <div className="flex items-center gap-2">
        <FolderOpen className="size-3" />
        <span>
          {activeProject
            ? shortenPath(activeProject.path, homedir)
            : "~/.claude"}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <StatusBarCliVersion />
        <div aria-hidden="true" className="h-3 w-px bg-border" />
        <StatusBarLanguage />
      </div>
    </footer>
  )
}

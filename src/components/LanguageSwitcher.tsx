import { m } from "@/paraglide/messages"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"

const localeLabels: Record<string, () => string> = {
  en: () => m.app_language_en(),
  ko: () => m.app_language_ko(),
}

export function LanguageSwitcher() {
  return (
    <div className="flex gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          className={`px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
            locale === getLocale()
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          {localeLabels[locale]()}
        </button>
      ))}
    </div>
  )
}

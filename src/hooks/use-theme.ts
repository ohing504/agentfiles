import { useCallback, useSyncExternalStore } from "react"

type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "agentfiles-theme"

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system"
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

// Simple pub/sub for cross-component sync
const listeners = new Set<() => void>()
let currentTheme: Theme = getStoredTheme()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return currentTheme
}

function setTheme(theme: Theme) {
  currentTheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  for (const listener of listeners) listener()
}

// Apply on load
if (typeof window !== "undefined") {
  applyTheme(currentTheme)
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (currentTheme === "system") applyTheme("system")
    })
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "system" as Theme,
  )
  const resolved = resolveTheme(theme)

  const toggle = useCallback(() => {
    const next = resolved === "dark" ? "light" : "dark"
    setTheme(next)
  }, [resolved])

  const set = useCallback((t: Theme) => setTheme(t), [])

  return { theme, resolved, toggle, setTheme: set }
}

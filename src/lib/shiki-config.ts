/** Shiki dual theme: supports both light and dark mode via CSS variables */
export const SHIKI_THEMES = {
  light: "github-light-default",
  dark: "github-dark-default",
} as const

/** defaultColor: light is default, dark switches via CSS variables */
export const SHIKI_DEFAULT_COLOR = "light" as const

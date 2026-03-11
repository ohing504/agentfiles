import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import {
  type CategoryId,
  type ConfigScope,
  DEFAULT_CATEGORY,
  DEFAULT_SCOPE,
} from "../constants"

export interface ConfigContextValue {
  scope: ConfigScope
  setScope: (scope: ConfigScope) => void
  category: CategoryId
  setCategory: (category: CategoryId) => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function useConfigSelection(): ConfigContextValue {
  const ctx = useContext(ConfigContext)
  if (!ctx) {
    throw new Error("useConfigSelection must be used within ConfigProvider")
  }
  return ctx
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeRaw] = useState<ConfigScope>(DEFAULT_SCOPE)
  const [category, setCategoryRaw] = useState<CategoryId>(DEFAULT_CATEGORY)

  const setScope = useCallback((s: ConfigScope) => setScopeRaw(s), [])
  const setCategory = useCallback((c: CategoryId) => setCategoryRaw(c), [])

  const value = useMemo(
    () => ({ scope, setScope, category, setCategory }),
    [scope, setScope, category, setCategory],
  )

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  )
}

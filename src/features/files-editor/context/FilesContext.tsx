import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { DEFAULT_SCOPE, type FilesScope } from "../constants"

export interface FilesContextValue {
  scope: FilesScope
  setScope: (scope: FilesScope) => void
  selectedPath: string | null
  setSelectedPath: (path: string | null) => void
}

const FilesCtx = createContext<FilesContextValue | null>(null)

export function useFilesSelection(): FilesContextValue {
  const ctx = useContext(FilesCtx)
  if (!ctx) {
    throw new Error("useFilesSelection must be used within FilesProvider")
  }
  return ctx
}

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeRaw] = useState<FilesScope>(DEFAULT_SCOPE)
  const [selectedPath, setSelectedPathRaw] = useState<string | null>(null)

  const setScope = useCallback((s: FilesScope) => {
    setScopeRaw(s)
    setSelectedPathRaw(null) // Clear selection on scope change
  }, [])

  const setSelectedPath = useCallback(
    (p: string | null) => setSelectedPathRaw(p),
    [],
  )

  const value = useMemo(
    () => ({ scope, setScope, selectedPath, setSelectedPath }),
    [scope, setScope, selectedPath, setSelectedPath],
  )

  return <FilesCtx.Provider value={value}>{children}</FilesCtx.Provider>
}

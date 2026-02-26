import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import type { HookScope, HooksSettings } from "@/shared/types"
import { useHooksQuery } from "../api/hooks.queries"
import type { SelectedHook } from "../constants"

export interface HooksContextValue {
  globalHooks: HooksSettings
  projectHooks: HooksSettings
  localHooks: HooksSettings
  isLoading: boolean
  selectedHook: SelectedHook | null
  handleSelectHook: (hook: SelectedHook) => void
  handleClearSelection: () => void
  editingHook: SelectedHook | null
  setEditingHook: (hook: SelectedHook | null) => void
  pendingDelete: SelectedHook | null
  setPendingDelete: (hook: SelectedHook | null) => void
  addDialogScope: HookScope | null
  handleAddClick: (scope: HookScope) => void
  handleAddClose: () => void
}

const HooksContext = createContext<HooksContextValue | null>(null)

export function useHooksSelection(): HooksContextValue {
  const ctx = useContext(HooksContext)
  if (!ctx) {
    throw new Error("useHooksSelection must be used within HooksProvider")
  }
  return ctx
}

export function HooksProvider({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  const [selectedHook, setSelectedHook] = useState<SelectedHook | null>(null)
  const [editingHook, setEditingHook] = useState<SelectedHook | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SelectedHook | null>(null)
  const [addDialogScope, setAddDialogScope] = useState<HookScope | null>(null)

  const globalQuery = useHooksQuery("global")
  const projectQuery = useHooksQuery("project")
  const localQuery = useHooksQuery("local")

  const isLoading =
    globalQuery.isLoading || projectQuery.isLoading || localQuery.isLoading
  const globalHooks: HooksSettings = globalQuery.data ?? {}
  const projectHooks: HooksSettings = projectQuery.data ?? {}
  const localHooks: HooksSettings = localQuery.data ?? {}

  const handleSelectHook = useCallback(
    (hook: SelectedHook) => {
      setSelectedHook(hook)
      onSelect?.()
    },
    [onSelect],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedHook(null)
    setEditingHook(null)
    setPendingDelete(null)
  }, [])

  const handleAddClick = useCallback(
    (scope: HookScope) => setAddDialogScope(scope),
    [],
  )

  const handleAddClose = useCallback(() => setAddDialogScope(null), [])

  const value = useMemo(
    () => ({
      globalHooks,
      projectHooks,
      localHooks,
      isLoading,
      selectedHook,
      handleSelectHook,
      handleClearSelection,
      editingHook,
      setEditingHook,
      pendingDelete,
      setPendingDelete,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    }),
    [
      globalHooks,
      projectHooks,
      localHooks,
      isLoading,
      selectedHook,
      handleSelectHook,
      handleClearSelection,
      editingHook,
      pendingDelete,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    ],
  )

  return <HooksContext.Provider value={value}>{children}</HooksContext.Provider>
}

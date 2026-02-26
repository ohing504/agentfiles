import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { AgentFile, Scope, SupportingFile } from "@/shared/types"
import { useSkillsQuery } from "../api/skills.queries"

export interface SkillsContextValue {
  skills: AgentFile[] | undefined
  selectedSkill: AgentFile | null
  selectedSupportingFile: SupportingFile | null
  expandedSkillPath: string | null
  handleSelectSkill: (skill: AgentFile) => void
  handleSelectSupportingFile: (sf: SupportingFile | null) => void
  handleExpandSkill: (path: string | null) => void
  handleClearSelection: () => void
  addDialogOpen: boolean
  addDialogScope: Scope
  handleAddClick: (scope: Scope) => void
  handleAddClose: () => void
}

const SkillsContext = createContext<SkillsContextValue | null>(null)

export function useSkillsSelection(): SkillsContextValue {
  const ctx = useContext(SkillsContext)
  if (!ctx) {
    throw new Error("useSkillsSelection must be used within SkillsProvider")
  }
  return ctx
}

export function SkillsProvider({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
  const [selectedSupportingFile, setSelectedSupportingFile] =
    useState<SupportingFile | null>(null)
  const [expandedSkillPath, setExpandedSkillPath] = useState<string | null>(
    null,
  )
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogScope, setAddDialogScope] = useState<Scope>("global")

  const { data: skills } = useSkillsQuery()

  // Auto-clear stale selection when skill disappears (e.g., after delete)
  useEffect(() => {
    if (
      selectedSkill &&
      skills &&
      !skills.some((s) => s.path === selectedSkill.path)
    ) {
      setSelectedSkill(null)
      setSelectedSupportingFile(null)
      setExpandedSkillPath(null)
    }
  }, [skills, selectedSkill])

  const handleSelectSkill = useCallback(
    (skill: AgentFile) => {
      setSelectedSkill(skill)
      setSelectedSupportingFile(null)
      // Only keep expanded if the selected skill has supporting files
      const hasSF =
        skill.isSkillDir &&
        skill.supportingFiles &&
        skill.supportingFiles.length > 0
      if (!hasSF) {
        setExpandedSkillPath(null)
      }
      onSelect?.()
    },
    [onSelect],
  )

  const handleSelectSupportingFile = useCallback(
    (sf: SupportingFile | null) => {
      setSelectedSupportingFile(sf)
      onSelect?.()
    },
    [onSelect],
  )

  const handleExpandSkill = useCallback(
    (path: string | null) => setExpandedSkillPath(path),
    [],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedSkill(null)
    setSelectedSupportingFile(null)
    setExpandedSkillPath(null)
  }, [])

  const handleAddClick = useCallback((scope: Scope) => {
    setAddDialogScope(scope)
    setAddDialogOpen(true)
  }, [])

  const handleAddClose = useCallback(() => setAddDialogOpen(false), [])

  const value = useMemo(
    () => ({
      skills,
      selectedSkill,
      selectedSupportingFile,
      expandedSkillPath,
      handleSelectSkill,
      handleSelectSupportingFile,
      handleExpandSkill,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    }),
    [
      skills,
      selectedSkill,
      selectedSupportingFile,
      expandedSkillPath,
      handleSelectSkill,
      handleSelectSupportingFile,
      handleExpandSkill,
      handleClearSelection,
      addDialogOpen,
      addDialogScope,
      handleAddClick,
      handleAddClose,
    ],
  )

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  )
}

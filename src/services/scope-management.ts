import fs from "node:fs/promises"
import path from "node:path"
import {
  getGlobalConfigPath,
  getProjectConfigPath,
} from "@/services/config-service"

const INVALID_NAME_PATTERN = /[/\\]|\.{2}/

interface MoveOrCopyParams {
  type: "skill" | "agent"
  name: string
  from: "user" | "project"
  to: "user" | "project"
  mode: "move" | "copy"
  projectPath?: string
}

function getEntityDirName(type: "skill" | "agent"): string {
  return `${type}s`
}

export async function moveOrCopyEntity(
  params: MoveOrCopyParams,
): Promise<void> {
  const { type, name, from, to, mode, projectPath } = params

  if (from === to) {
    throw new Error(`Source and target scope are the same: ${from}`)
  }

  if (!name || INVALID_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid item name: ${name}`)
  }

  const dirName = getEntityDirName(type)
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  const sourceBase = from === "user" ? globalBase : projectBase
  const targetBase = to === "user" ? globalBase : projectBase

  const fileName = `${name}.md`
  const sourcePath = path.join(sourceBase, dirName, fileName)
  const targetDir = path.join(targetBase, dirName)
  const targetPath = path.join(targetDir, fileName)

  await fs.mkdir(targetDir, { recursive: true })
  await fs.cp(sourcePath, targetPath, { recursive: true })

  if (mode === "move") {
    await fs.rm(sourcePath, { recursive: true, force: true })
  }
}

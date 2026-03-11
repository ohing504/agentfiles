// src/services/skills-cli-service.ts
import { spawn } from "node:child_process"

const TIMEOUT_MS = 30_000

export interface SkillsRemoveOptions {
  name: string
  scope: "user" | "project"
  agent?: string
  projectPath?: string
}

export interface SkillsCliResult {
  success: boolean
  output: string
}

function execSkills(
  args: string[],
  options?: { cwd?: string; timeout?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["skills", ...args], {
      cwd: options?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timeoutMs = options?.timeout ?? TIMEOUT_MS
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`skills ${args[0]} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0 && code !== null) {
        const detail = stderr.trim() || stdout.trim() || `exit code ${code}`
        reject(new Error(detail))
      } else {
        resolve(stdout)
      }
    })

    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function removeSkill(
  options: SkillsRemoveOptions,
): Promise<SkillsCliResult> {
  const args: string[] = ["remove", options.name, "-y"]

  if (options.scope === "user") {
    args.push("--global")
  }

  if (options.agent) {
    args.push("--agent", options.agent)
  }

  try {
    const output = await execSkills(args, {
      cwd: options.scope === "project" ? options.projectPath : undefined,
    })
    return { success: true, output }
  } catch (err) {
    return {
      success: false,
      output: err instanceof Error ? err.message : String(err),
    }
  }
}

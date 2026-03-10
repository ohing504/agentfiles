import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { scanSkillsDir } from "@/services/agent-file-service"

describe("scanSkillsDir – symlink handling", () => {
  let tmpDir: string
  let skillsDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skills-test-"))
    skillsDir = path.join(tmpDir, "skills")
    await fs.mkdir(skillsDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it("finds a real directory skill with SKILL.md", async () => {
    const skillDir = path.join(skillsDir, "my-skill")
    await fs.mkdir(skillDir)
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A real skill\n---\n\n# My Skill\n",
    )

    const results = await scanSkillsDir(skillsDir)

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("my-skill")
    expect(results[0].isSkillDir).toBe(true)
    expect(results[0].frontmatter?.name).toBe("my-skill")
  })

  it("finds a flat .md skill file", async () => {
    await fs.writeFile(
      path.join(skillsDir, "flat-skill.md"),
      "---\nname: flat-skill\n---\n\n# Flat Skill\n",
    )

    const results = await scanSkillsDir(skillsDir)

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("flat-skill")
    expect(results[0].isSkillDir).toBe(false)
  })

  it("finds a symlinked directory skill with SKILL.md", async () => {
    // Create the actual skill directory outside skillsDir (like ~/.agents/skills/)
    const externalDir = path.join(tmpDir, "agents-skills")
    const externalSkillDir = path.join(externalDir, "linked-skill")
    await fs.mkdir(externalSkillDir, { recursive: true })
    await fs.writeFile(
      path.join(externalSkillDir, "SKILL.md"),
      "---\nname: linked-skill\ndescription: A symlinked skill\n---\n\n# Linked Skill\n",
    )
    await fs.writeFile(
      path.join(externalSkillDir, "helper.ts"),
      "export const foo = 1;",
    )

    // Create symlink: skills/linked-skill -> ../agents-skills/linked-skill
    await fs.symlink(externalSkillDir, path.join(skillsDir, "linked-skill"))

    const results = await scanSkillsDir(skillsDir)

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("linked-skill")
    expect(results[0].type).toBe("skill")
    expect(results[0].isSkillDir).toBe(true)
    expect(results[0].isSymlink).toBe(true)
    expect(results[0].frontmatter?.name).toBe("linked-skill")
    expect(results[0].supportingFiles).toBeDefined()
    expect(results[0].supportingFiles).toHaveLength(1)
    expect(results[0].supportingFiles?.[0].name).toBe("helper.ts")
  })

  it("finds mixed: real dir, symlinked dir, and flat file", async () => {
    // Real directory skill
    const realSkill = path.join(skillsDir, "real-skill")
    await fs.mkdir(realSkill)
    await fs.writeFile(
      path.join(realSkill, "SKILL.md"),
      "---\nname: real-skill\n---\n\n# Real\n",
    )

    // Flat .md skill
    await fs.writeFile(
      path.join(skillsDir, "flat.md"),
      "---\nname: flat\n---\n\n# Flat\n",
    )

    // External symlinked skill
    const externalDir = path.join(tmpDir, "external")
    const extSkill = path.join(externalDir, "ext-skill")
    await fs.mkdir(extSkill, { recursive: true })
    await fs.writeFile(
      path.join(extSkill, "SKILL.md"),
      "---\nname: ext-skill\n---\n\n# External\n",
    )
    await fs.symlink(extSkill, path.join(skillsDir, "ext-skill"))

    const results = await scanSkillsDir(skillsDir)
    const names = results.map((r) => r.name).sort()

    expect(names).toEqual(["ext-skill", "flat", "real-skill"])
  })

  it("skips broken symlinks gracefully", async () => {
    // Create symlink pointing to non-existent target
    await fs.symlink(
      path.join(tmpDir, "non-existent"),
      path.join(skillsDir, "broken-link"),
    )

    // Real skill so we verify scanning continues
    const realSkill = path.join(skillsDir, "good-skill")
    await fs.mkdir(realSkill)
    await fs.writeFile(
      path.join(realSkill, "SKILL.md"),
      "---\nname: good-skill\n---\n\n# Good\n",
    )

    const results = await scanSkillsDir(skillsDir)

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("good-skill")
  })

  it("handles symlinked directory without SKILL.md", async () => {
    // Symlink to directory that has no SKILL.md
    const externalDir = path.join(tmpDir, "no-skillmd")
    await fs.mkdir(externalDir, { recursive: true })
    await fs.writeFile(path.join(externalDir, "README.md"), "# Hello")

    await fs.symlink(externalDir, path.join(skillsDir, "no-skillmd"))

    const results = await scanSkillsDir(skillsDir)

    expect(results).toHaveLength(0)
  })
})

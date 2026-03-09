import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

import fs from "node:fs/promises"
import { getAgentfilesConfig, setMainAgent } from "@/services/agentfiles-config"

const mockedReadFile = vi.mocked(fs.readFile)
const mockedWriteFile = vi.mocked(fs.writeFile)
const mockedMkdir = vi.mocked(fs.mkdir)

describe("agentfiles-config", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedMkdir.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
  })

  it("returns default config when file does not exist", async () => {
    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    const config = await getAgentfilesConfig()
    expect(config.mainAgent).toBe("claude-code")
  })

  it("reads existing config", async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ mainAgent: "claude-code" }),
    )
    const config = await getAgentfilesConfig()
    expect(config.mainAgent).toBe("claude-code")
  })

  it("writes main agent selection", async () => {
    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    await setMainAgent("claude-code")
    expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    const written = JSON.parse(mockedWriteFile.mock.calls[0][1] as string)
    expect(written.mainAgent).toBe("claude-code")
  })
})

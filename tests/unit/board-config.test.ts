import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

import fs from "node:fs/promises"
import {
  DEFAULT_BOARD_CONFIG,
  getAgentfilesConfig,
  updateBoardConfig,
} from "@/services/agentfiles-config"

const mockedReadFile = vi.mocked(fs.readFile)
const mockedWriteFile = vi.mocked(fs.writeFile)
const mockedMkdir = vi.mocked(fs.mkdir)

describe("board-config", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedMkdir.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
  })

  it("returns default board config when file does not exist", async () => {
    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    const config = await getAgentfilesConfig()
    expect(config.board).toEqual(DEFAULT_BOARD_CONFIG)
    expect(config.board.columnOrder).toHaveLength(8)
    expect(config.board.hiddenColumns).toEqual(["lsp"])
  })

  it("reads existing board config from file", async () => {
    const customBoard = {
      columnOrder: [
        "mcp",
        "skills",
        "files",
        "plugins",
        "agents",
        "hooks",
        "memory",
        "lsp",
      ],
      hiddenColumns: [],
    }
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ mainAgent: "claude-code", board: customBoard }),
    )
    const config = await getAgentfilesConfig()
    expect(config.board.columnOrder).toEqual(customBoard.columnOrder)
    expect(config.board.hiddenColumns).toEqual([])
  })

  it("deep-merges board config with defaults for partial config", async () => {
    // 파일에 board.hiddenColumns만 있는 경우 columnOrder는 기본값 유지
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        mainAgent: "claude-code",
        board: { hiddenColumns: ["memory", "lsp"] },
      }),
    )
    const config = await getAgentfilesConfig()
    expect(config.board.columnOrder).toEqual(DEFAULT_BOARD_CONFIG.columnOrder)
    expect(config.board.hiddenColumns).toEqual(["memory", "lsp"])
  })

  it("updates board config while preserving other fields", async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ mainAgent: "claude-code", board: DEFAULT_BOARD_CONFIG }),
    )
    const newOrder = [
      "mcp",
      "skills",
      "files",
      "plugins",
      "agents",
      "hooks",
      "memory",
      "lsp",
    ] as const
    await updateBoardConfig({ columnOrder: [...newOrder] })

    expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    const written = JSON.parse(mockedWriteFile.mock.calls[0][1] as string)
    expect(written.mainAgent).toBe("claude-code")
    expect(written.board.columnOrder).toEqual([...newOrder])
    expect(written.board.hiddenColumns).toEqual(["lsp"])
  })

  it("updates hiddenColumns without changing columnOrder", async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ mainAgent: "claude-code", board: DEFAULT_BOARD_CONFIG }),
    )
    await updateBoardConfig({ hiddenColumns: [] })

    expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    const written = JSON.parse(mockedWriteFile.mock.calls[0][1] as string)
    expect(written.board.columnOrder).toEqual(DEFAULT_BOARD_CONFIG.columnOrder)
    expect(written.board.hiddenColumns).toEqual([])
  })
})

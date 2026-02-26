import { describe, expect, it } from "vitest"
import {
  type CategoryId,
  CONFIG_CATEGORIES,
  getCategoryById,
} from "./constants"

describe("constants", () => {
  it("defines exactly 6 categories", () => {
    expect(CONFIG_CATEGORIES).toHaveLength(6)
  })

  it("each category has id, label, and keys array", () => {
    for (const cat of CONFIG_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.label).toBeTruthy()
      expect(cat.keys.length).toBeGreaterThan(0)
    }
  })

  it("getCategoryById returns correct category", () => {
    const general = getCategoryById("general")
    expect(general?.id).toBe("general")
    expect(general?.keys).toContain("model")
  })

  it("getCategoryById returns undefined for unknown id", () => {
    expect(getCategoryById("nonexistent" as CategoryId)).toBeUndefined()
  })

  it("general category contains official settings keys", () => {
    const general = getCategoryById("general")!
    expect(general.keys).toContain("model")
    expect(general.keys).toContain("language")
    expect(general.keys).toContain("alwaysThinkingEnabled")
  })

  it("permissions category contains permissions key", () => {
    const perms = getCategoryById("permissions")!
    expect(perms.keys).toContain("permissions")
  })

  it("sandbox category contains sandbox key", () => {
    const sandbox = getCategoryById("sandbox")!
    expect(sandbox.keys).toContain("sandbox")
  })
})

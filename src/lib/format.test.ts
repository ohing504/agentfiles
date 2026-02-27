import { describe, expect, it } from "vitest"
import { titleCase } from "@/lib/format"

describe("titleCase", () => {
  it("converts hyphenated names", () => {
    expect(titleCase("frontend-design")).toBe("Frontend Design")
  })

  it("converts underscored names", () => {
    expect(titleCase("some_plugin_name")).toBe("Some Plugin Name")
  })

  it("converts mixed hyphens and underscores", () => {
    expect(titleCase("my-plugin_v2")).toBe("My Plugin V2")
  })

  it("handles single word", () => {
    expect(titleCase("plugin")).toBe("Plugin")
  })

  it("handles already title-cased string", () => {
    expect(titleCase("Already Good")).toBe("Already Good")
  })

  it("handles empty string", () => {
    expect(titleCase("")).toBe("")
  })

  it("handles multiple consecutive separators", () => {
    expect(titleCase("a--b__c")).toBe("A  B  C")
  })
})

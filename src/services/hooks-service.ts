import fs from "node:fs/promises"
import path from "node:path"
import type {
  HookEventName,
  HookMatcherGroup,
  HooksSettings,
} from "@/shared/types"

// ── settings.json 읽기 헬퍼 ──

async function readSettingsJson(
  basePath: string,
): Promise<Record<string, unknown>> {
  const settingsPath = path.join(basePath, "settings.json")
  try {
    const content = await fs.readFile(settingsPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── settings.json 쓰기 헬퍼 ──

async function writeSettingsJson(
  basePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(basePath, { recursive: true })
  const filePath = path.join(basePath, "settings.json")
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8")
}

// ── 1. getHooksFromSettings ──

export async function getHooksFromSettings(
  basePath: string,
): Promise<HooksSettings> {
  const settings = await readSettingsJson(basePath)
  if (
    !settings.hooks ||
    typeof settings.hooks !== "object" ||
    Array.isArray(settings.hooks)
  ) {
    return {}
  }
  return settings.hooks as HooksSettings
}

// ── 2. saveHooksToSettings ──

export async function saveHooksToSettings(
  basePath: string,
  hooks: HooksSettings,
): Promise<void> {
  const settings = await readSettingsJson(basePath)
  if (Object.keys(hooks).length === 0) {
    // 빈 객체면 hooks 키 제거
    const { hooks: _removed, ...rest } = settings
    void _removed
    await writeSettingsJson(basePath, rest)
  } else {
    await writeSettingsJson(basePath, { ...settings, hooks })
  }
}

// ── 3. addHookToSettings ──

export async function addHookToSettings(
  basePath: string,
  event: HookEventName,
  matcherGroup: HookMatcherGroup,
): Promise<void> {
  const hooks = await getHooksFromSettings(basePath)
  const existing = hooks[event] ?? []
  const updated: HooksSettings = {
    ...hooks,
    [event]: [...existing, matcherGroup],
  }
  await saveHooksToSettings(basePath, updated)
}

// ── 4. removeHookFromSettings ──

export async function removeHookFromSettings(
  basePath: string,
  event: HookEventName,
  groupIndex: number,
  hookIndex: number,
): Promise<void> {
  const hooks = await getHooksFromSettings(basePath)
  const groups = hooks[event]
  if (!groups) return

  const group = groups[groupIndex]
  if (!group) return

  // hook 삭제
  const updatedHooks = group.hooks.filter((_, i) => i !== hookIndex)

  if (updatedHooks.length === 0) {
    // group이 비면 group 삭제
    const updatedGroups = groups.filter((_, i) => i !== groupIndex)

    if (updatedGroups.length === 0) {
      // event가 비면 event 삭제
      const { [event]: _removed, ...rest } = hooks
      void _removed
      await saveHooksToSettings(basePath, rest as HooksSettings)
    } else {
      await saveHooksToSettings(basePath, { ...hooks, [event]: updatedGroups })
    }
  } else {
    const updatedGroups = groups.map((g, i) =>
      i === groupIndex ? { ...g, hooks: updatedHooks } : g,
    )
    await saveHooksToSettings(basePath, { ...hooks, [event]: updatedGroups })
  }
}

// ── 5. readScriptFile ──

export async function readScriptFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8")
  } catch {
    return null
  }
}

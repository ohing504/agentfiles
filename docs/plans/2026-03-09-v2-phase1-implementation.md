# v2 Phase 1: Agent Ecosystem Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AgentConfig 레지스트리, Main Agent 선택기, 스코프 이동/복사, 중복 감지를 구현하여 agentfiles를 에이전트 생태계 매니저로 진화시킨다.

**Architecture:** 기존 v1 대시보드 레이아웃을 유지하면서 AgentConfig 레지스트리로 멀티 에이전트 확장 기반을 만들고, 스코프 관리(User ↔ Project 이동/복사)와 중복 감지를 추가한다. CLI 위임 원칙을 강화한다.

**Tech Stack:** TypeScript, TanStack Start, React 19, shadcn/ui, Vitest

**Design Doc:** `docs/plans/2026-03-09-v2-redesign-agent-ecosystem-manager.md`

---

## 실행 규칙

1. **각 Task = 1 논리적 커밋 단위**
2. Task 완료 후 반드시 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 통과
3. 사용자 피드백 받은 후 문제 없을 때만 커밋
4. 문제가 있으면 해결 후 다시 피드백 요청

---

## Task 1: AgentConfig 타입 및 레지스트리

> 멀티 에이전트 확장의 기초 타입과 레지스트리 서비스를 추가한다.

**Files:**
- Modify: `src/shared/types.ts` — AgentType, EntityType, AgentConfig 타입 추가
- Create: `src/services/agent-registry.ts` — 에이전트 레지스트리
- Create: `tests/unit/agent-registry.test.ts` — 레지스트리 테스트

### Step 1: 테스트 작성

```typescript
// tests/unit/agent-registry.test.ts
import { describe, expect, it } from "vitest"
import {
  getAgentConfig,
  getAgentRegistry,
  getSupportedEntities,
} from "@/services/agent-registry"

describe("agent-registry", () => {
  it("returns all registered agents", () => {
    const agents = getAgentRegistry()
    expect(agents.length).toBeGreaterThanOrEqual(1)
    expect(agents[0].name).toBe("claude-code")
  })

  it("returns config for claude-code", () => {
    const config = getAgentConfig("claude-code")
    expect(config).toBeDefined()
    expect(config!.displayName).toBe("Claude Code")
    expect(config!.entities).toContain("skill")
    expect(config!.entities).toContain("plugin")
    expect(config!.entities).toContain("mcp")
    expect(config!.entities).toContain("hook")
    expect(config!.entities).toContain("agent")
  })

  it("returns undefined for unknown agent", () => {
    const config = getAgentConfig("unknown-agent" as any)
    expect(config).toBeUndefined()
  })

  it("returns supported entities for claude-code", () => {
    const entities = getSupportedEntities("claude-code")
    expect(entities).toContain("skill")
    expect(entities).toContain("plugin")
  })
})
```

### Step 2: 테스트 실패 확인

Run: `pnpm test tests/unit/agent-registry.test.ts`
Expected: FAIL — 모듈 없음

### Step 3: 타입 추가

```typescript
// src/shared/types.ts 에 추가

// ── Agent Config ──
export type AgentType = "claude-code" // 향후: | "codex" | "cursor" | ...
export type EntityType = "skill" | "agent" | "hook" | "plugin" | "mcp"

export interface AgentConfig {
  name: AgentType
  displayName: string
  /** 프로젝트 상대 경로 (e.g., ".claude/skills") */
  skillsDir: string
  /** 글로벌 절대 경로 (e.g., "~/.claude/skills") — 런타임에 homedir 치환 */
  globalSkillsDir: string | undefined
  /** 프로젝트 설정 디렉토리 (e.g., ".claude") */
  configDir: string
  /** 글로벌 설정 디렉토리 (e.g., "~/.claude") */
  globalConfigDir: string | undefined
  /** 지원하는 엔티티 타입 */
  entities: EntityType[]
}
```

### Step 4: 레지스트리 구현

```typescript
// src/services/agent-registry.ts
import type { AgentConfig, AgentType, EntityType } from "@/shared/types"

const AGENT_REGISTRY: AgentConfig[] = [
  {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills",
    configDir: ".claude",
    globalConfigDir: "~/.claude",
    entities: ["skill", "agent", "hook", "plugin", "mcp"],
  },
]

export function getAgentRegistry(): AgentConfig[] {
  return AGENT_REGISTRY
}

export function getAgentConfig(name: AgentType): AgentConfig | undefined {
  return AGENT_REGISTRY.find((a) => a.name === name)
}

export function getSupportedEntities(name: AgentType): EntityType[] {
  return getAgentConfig(name)?.entities ?? []
}
```

### Step 5: 테스트 통과 확인

Run: `pnpm test tests/unit/agent-registry.test.ts`
Expected: PASS

### Step 6: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(agent): add AgentConfig types and registry`

---

## Task 2: Main Agent 설정 저장

> Main Agent 선택을 `~/.claude/agentfiles.json`에 저장/읽기하는 서비스를 추가한다.

**Files:**
- Modify: `src/shared/types.ts` — AgentfilesConfig 타입 추가
- Create: `src/services/agentfiles-config.ts` — 설정 읽기/쓰기
- Create: `src/server/agent-config.ts` — 서버 함수
- Create: `tests/unit/agentfiles-config.test.ts` — 테스트

### Step 1: 테스트 작성

```typescript
// tests/unit/agentfiles-config.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}))

import fs from "node:fs/promises"
import {
  getAgentfilesConfig,
  setMainAgent,
} from "@/services/agentfiles-config"

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
```

### Step 2: 테스트 실패 확인

Run: `pnpm test tests/unit/agentfiles-config.test.ts`
Expected: FAIL

### Step 3: 타입 추가

```typescript
// src/shared/types.ts 에 추가

export interface AgentfilesConfig {
  mainAgent: AgentType
}
```

### Step 4: 서비스 구현

```typescript
// src/services/agentfiles-config.ts
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import type { AgentfilesConfig, AgentType } from "@/shared/types"

const CONFIG_PATH = path.join(os.homedir(), ".claude", "agentfiles.json")

const DEFAULT_CONFIG: AgentfilesConfig = {
  mainAgent: "claude-code",
}

export async function getAgentfilesConfig(): Promise<AgentfilesConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    const parsed = JSON.parse(content)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function setMainAgent(agent: AgentType): Promise<void> {
  const config = await getAgentfilesConfig()
  config.mainAgent = agent
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
```

### Step 5: 서버 함수 추가

```typescript
// src/server/agent-config.ts
import { createServerFn } from "@tanstack/react-start"

export const getMainAgentFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAgentfilesConfig } = await import(
      "@/services/agentfiles-config"
    )
    const config = await getAgentfilesConfig()
    return config.mainAgent
  },
)

export const setMainAgentFn = createServerFn({ method: "POST" })
  .validator((data: { agent: string }) => data)
  .handler(async ({ data }) => {
    const { setMainAgent } = await import("@/services/agentfiles-config")
    const { getAgentConfig } = await import("@/services/agent-registry")
    const config = getAgentConfig(data.agent as any)
    if (!config) throw new Error(`Unknown agent: ${data.agent}`)
    await setMainAgent(data.agent as any)
    return { success: true }
  })

export const getInstalledAgentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAgentRegistry } = await import("@/services/agent-registry")
    return getAgentRegistry()
  },
)
```

### Step 6: 테스트 통과 확인

Run: `pnpm test tests/unit/agentfiles-config.test.ts`
Expected: PASS

### Step 7: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(agent): add agentfiles config storage and server functions`

---

## Task 3: Main Agent Context + Selector UI

> Main Agent 상태를 React Context로 관리하고, AppHeader에 선택기를 추가한다.

**Files:**
- Create: `src/components/AgentContext.tsx` — React Context
- Modify: `src/components/layout/AppHeader.tsx` — 선택기 추가
- Modify: `src/routes/__root.tsx` — AgentProvider 추가

### Step 1: AgentContext 구현

```typescript
// src/components/AgentContext.tsx
import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AgentConfig, AgentType } from "@/shared/types"

interface AgentContextValue {
  mainAgent: AgentType
  mainAgentConfig: AgentConfig | undefined
  installedAgents: AgentConfig[]
  setMainAgent: (agent: AgentType) => void
  isLoading: boolean
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: mainAgent = "claude-code", isLoading: isLoadingAgent } =
    useQuery({
      queryKey: ["mainAgent"],
      queryFn: async () => {
        const { getMainAgentFn } = await import("@/server/agent-config")
        return getMainAgentFn()
      },
    })

  const { data: installedAgents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ["installedAgents"],
    queryFn: async () => {
      const { getInstalledAgentsFn } = await import("@/server/agent-config")
      return getInstalledAgentsFn()
    },
  })

  const setMainAgentMutation = useMutation({
    mutationFn: async (agent: AgentType) => {
      const { setMainAgentFn } = await import("@/server/agent-config")
      return setMainAgentFn({ data: { agent } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainAgent"] })
    },
  })

  const mainAgentConfig = installedAgents.find((a) => a.name === mainAgent)

  return (
    <AgentContext value={{
      mainAgent,
      mainAgentConfig,
      installedAgents,
      setMainAgent: (agent) => setMainAgentMutation.mutate(agent),
      isLoading: isLoadingAgent || isLoadingAgents,
    }}>
      {children}
    </AgentContext>
  )
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider")
  return ctx
}
```

### Step 2: AppHeader에 선택기 추가

`src/components/layout/AppHeader.tsx`를 수정하여:
- 기존 ProjectSwitcher 왼쪽에 Main Agent 드롭다운 추가
- 현재는 "Claude Code" 하나만 표시 (향후 에이전트 추가 시 확장)
- shadcn `Select` 또는 `DropdownMenu` 컴포넌트 사용

```tsx
// AppHeader.tsx 에 추가할 부분
import { useAgentContext } from "@/components/AgentContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 헤더 내부:
const { mainAgent, installedAgents, setMainAgent } = useAgentContext()

<Select value={mainAgent} onValueChange={setMainAgent}>
  <SelectTrigger className="w-[160px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {installedAgents.map((agent) => (
      <SelectItem key={agent.name} value={agent.name}>
        {agent.displayName}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 3: Root Layout에 Provider 추가

`src/routes/__root.tsx`의 `RootComponent`에서 `AgentProvider`로 감싸기:

```tsx
// __root.tsx
import { AgentProvider } from "@/components/AgentContext"

// RootComponent 내부:
<AgentProvider>
  <TooltipProvider>
    {/* 기존 내용 */}
  </TooltipProvider>
</AgentProvider>
```

### Step 4: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### Step 5: 수동 확인

- 헤더에 Main Agent 선택기가 보이는지
- "Claude Code"가 기본 선택되어 있는지
- 선택 변경 시 agentfiles.json에 저장되는지

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(agent): add Main Agent context and selector UI`

---

## Task 4: 스코프 관리 — 서버 함수

> Skills, Agents를 User ↔ Project 간 이동/복사하는 서버 함수를 추가한다.

**Files:**
- Create: `src/server/scope-management.ts` — 이동/복사 서버 함수
- Create: `tests/unit/scope-management.test.ts` — 테스트

### Step 1: 테스트 작성

```typescript
// tests/unit/scope-management.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  default: {
    cp: vi.fn(),
    rm: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
  },
}))

vi.mock("@/services/config-service", () => ({
  getGlobalConfigPath: vi.fn(() => "/home/user/.claude"),
  getProjectConfigPath: vi.fn(() => "/project/.claude"),
}))

import fs from "node:fs/promises"
import { moveOrCopyEntity } from "@/services/scope-management"

const mockedCp = vi.mocked(fs.cp)
const mockedRm = vi.mocked(fs.rm)
const mockedMkdir = vi.mocked(fs.mkdir)

describe("scope-management", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedCp.mockResolvedValue(undefined)
    mockedRm.mockResolvedValue(undefined)
    mockedMkdir.mockResolvedValue(undefined)
  })

  it("copies a skill from user to project", async () => {
    await moveOrCopyEntity({
      type: "skill",
      name: "my-skill",
      sourcePath: "/home/user/.claude/skills/my-skill",
      from: "user",
      to: "project",
      mode: "copy",
      projectPath: "/project",
    })
    expect(mockedCp).toHaveBeenCalledTimes(1)
    expect(mockedRm).not.toHaveBeenCalled()
  })

  it("moves a skill from project to user", async () => {
    await moveOrCopyEntity({
      type: "skill",
      name: "my-skill",
      sourcePath: "/project/.claude/skills/my-skill",
      from: "project",
      to: "user",
      mode: "move",
      projectPath: "/project",
    })
    expect(mockedCp).toHaveBeenCalledTimes(1)
    expect(mockedRm).toHaveBeenCalledTimes(1)
  })

  it("throws if source and target scope are the same", async () => {
    await expect(
      moveOrCopyEntity({
        type: "skill",
        name: "my-skill",
        sourcePath: "/home/user/.claude/skills/my-skill",
        from: "user",
        to: "user",
        mode: "move",
      }),
    ).rejects.toThrow()
  })
})
```

### Step 2: 테스트 실패 확인

Run: `pnpm test tests/unit/scope-management.test.ts`
Expected: FAIL

### Step 3: 서비스 구현

```typescript
// src/services/scope-management.ts
import fs from "node:fs/promises"
import path from "node:path"
import {
  getGlobalConfigPath,
  getProjectConfigPath,
} from "@/services/config-service"
import type { Scope } from "@/shared/types"

interface MoveOrCopyParams {
  type: "skill" | "agent"
  name: string
  sourcePath: string
  from: Scope
  to: Scope
  mode: "move" | "copy"
  projectPath?: string
}

/** 에이전트 파일 타입에 해당하는 디렉토리 이름 */
function getEntityDirName(type: "skill" | "agent"): string {
  return type === "skill" ? "skills" : "agents"
}

export async function moveOrCopyEntity(params: MoveOrCopyParams): Promise<void> {
  const { type, name, sourcePath, from, to, mode, projectPath } = params

  if (from === to) {
    throw new Error(`Source and target scope are the same: ${from}`)
  }

  const dirName = getEntityDirName(type)
  const globalBase = getGlobalConfigPath()
  const projectBase = getProjectConfigPath(projectPath)

  const targetBase = to === "user" ? globalBase : projectBase
  const targetDir = path.join(targetBase, dirName)
  const targetPath = path.join(targetDir, path.basename(sourcePath))

  await fs.mkdir(targetDir, { recursive: true })
  await fs.cp(sourcePath, targetPath, { recursive: true })

  if (mode === "move") {
    await fs.rm(sourcePath, { recursive: true, force: true })
  }
}
```

### Step 4: 서버 함수 추가

```typescript
// src/server/scope-management.ts
import { createServerFn } from "@tanstack/react-start"

export const moveOrCopyEntityFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      type: "skill" | "agent"
      name: string
      sourcePath: string
      from: string
      to: string
      mode: "move" | "copy"
      projectPath?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { validateFilePath } = await import("@/server/validation")
    validateFilePath(data.sourcePath)
    const { moveOrCopyEntity } = await import(
      "@/services/scope-management"
    )
    await moveOrCopyEntity({
      ...data,
      from: data.from as any,
      to: data.to as any,
    })
    return { success: true }
  })
```

### Step 5: 테스트 통과 확인

Run: `pnpm test tests/unit/scope-management.test.ts`
Expected: PASS

### Step 6: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(scope): add move/copy server functions for skills and agents`

---

## Task 5: 스코프 관리 — 컨텍스트 메뉴 UI

> 엔티티 액션 메뉴에 "이동/복사" 옵션을 추가한다.

**Files:**
- Modify: `src/lib/entity-actions.ts` — scope 이동/복사 액션 추가
- Modify: `src/features/dashboard/hooks/use-entity-action-handler.ts` — 핸들러 추가
- Modify: 관련 패널 컴포넌트 — 새 액션 전달

### Step 1: entity-actions.ts에 액션 추가

```typescript
// src/lib/entity-actions.ts 에 추가할 액션들

export const moveToUser: EntityAction = {
  id: "move-to-user",
  label: "글로벌로 이동",
  icon: ArrowUpIcon,  // lucide-react
}

export const copyToUser: EntityAction = {
  id: "copy-to-user",
  label: "글로벌로 복사",
  icon: CopyIcon,  // lucide-react
}

export const moveToProject: EntityAction = {
  id: "move-to-project",
  label: "프로젝트로 이동",
  icon: ArrowDownIcon,  // lucide-react
}

export const copyToProject: EntityAction = {
  id: "copy-to-project",
  label: "프로젝트로 복사",
  icon: CopyIcon,  // lucide-react
}
```

스코프에 따라 동적으로 액션을 결정:
- User 스코프 아이템: `moveToProject`, `copyToProject` 표시
- Project 스코프 아이템: `moveToUser`, `copyToUser` 표시

### Step 2: use-entity-action-handler.ts 수정

`handleAction`에서 새 액션 ID를 처리:
- `move-to-user`, `copy-to-user`: `moveOrCopyEntityFn` 호출 (to: "user", mode에 따라)
- `move-to-project`, `copy-to-project`: `moveOrCopyEntityFn` 호출 (to: "project", mode에 따라)
- 성공 후 React Query 무효화 (overview, agentFiles)

### Step 3: 패널에 스코프 액션 전달

대시보드 패널 컴포넌트(SkillsPanel, AgentsPanel)에서 아이템의 스코프에 따라 적절한 액션 배열을 구성하여 컨텍스트 메뉴/드롭다운에 전달.

**주의:** 프로젝트가 선택되지 않은 상태(Global Only)에서는 프로젝트 관련 액션 숨김.

### Step 4: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### Step 5: 수동 확인

- Skill 아이템 우클릭 → "프로젝트로 이동/복사" 메뉴 표시
- Project 스코프 아이템 → "글로벌로 이동/복사" 메뉴 표시
- Global Only 모드 → 프로젝트 관련 액션 숨김
- 이동 실행 → 파일이 실제로 이동됨
- 복사 실행 → 원본 유지 + 대상에 복사됨

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(scope): add move/copy actions to entity context menu`

---

## Task 6: 중복 감지 및 경고 표시

> Plugin 내부 엔티티와 standalone 엔티티 간 중복, User/Project 간 중복을 감지하고 UI에 표시한다.

**Files:**
- Create: `src/services/duplicate-detection.ts` — 중복 감지 로직
- Create: `tests/unit/duplicate-detection.test.ts` — 테스트
- Modify: 대시보드 패널 컴포넌트 — 경고 배지 표시

### Step 1: 테스트 작성

```typescript
// tests/unit/duplicate-detection.test.ts
import { describe, expect, it } from "vitest"
import { detectDuplicates } from "@/services/duplicate-detection"
import type { AgentFile, Plugin } from "@/shared/types"

describe("duplicate-detection", () => {
  it("detects standalone skill duplicated in plugin", () => {
    const standaloneSkills: AgentFile[] = [
      { name: "brainstorming", scope: "user", type: "skill" } as AgentFile,
    ]
    const plugins: Plugin[] = [
      {
        name: "superpowers",
        contents: {
          skills: [
            { name: "brainstorming", type: "skill" } as AgentFile,
          ],
        },
      } as Plugin,
    ]
    const result = detectDuplicates({ standaloneSkills, plugins })
    expect(result.skillDuplicates).toHaveLength(1)
    expect(result.skillDuplicates[0].name).toBe("brainstorming")
    expect(result.skillDuplicates[0].pluginName).toBe("superpowers")
  })

  it("detects same skill in both user and project scope", () => {
    const standaloneSkills: AgentFile[] = [
      { name: "my-skill", scope: "user", type: "skill" } as AgentFile,
      { name: "my-skill", scope: "project", type: "skill" } as AgentFile,
    ]
    const result = detectDuplicates({ standaloneSkills, plugins: [] })
    expect(result.scopeDuplicates).toHaveLength(1)
    expect(result.scopeDuplicates[0].name).toBe("my-skill")
  })

  it("returns empty when no duplicates", () => {
    const standaloneSkills: AgentFile[] = [
      { name: "unique-skill", scope: "user", type: "skill" } as AgentFile,
    ]
    const result = detectDuplicates({ standaloneSkills, plugins: [] })
    expect(result.skillDuplicates).toHaveLength(0)
    expect(result.scopeDuplicates).toHaveLength(0)
  })
})
```

### Step 2: 테스트 실패 확인

Run: `pnpm test tests/unit/duplicate-detection.test.ts`
Expected: FAIL

### Step 3: 중복 감지 서비스 구현

```typescript
// src/services/duplicate-detection.ts
import type { AgentFile, Plugin } from "@/shared/types"

export interface SkillDuplicate {
  name: string
  standaloneScope: string
  pluginName: string
}

export interface ScopeDuplicate {
  name: string
  type: string
}

export interface DuplicateResult {
  skillDuplicates: SkillDuplicate[]
  scopeDuplicates: ScopeDuplicate[]
}

interface DetectParams {
  standaloneSkills: AgentFile[]
  standaloneAgents?: AgentFile[]
  plugins: Plugin[]
}

export function detectDuplicates(params: DetectParams): DuplicateResult {
  const { standaloneSkills, standaloneAgents = [], plugins } = params

  // 1. Plugin 내부 skill과 standalone skill 이름 충돌
  const pluginSkillNames = new Map<string, string>()
  for (const plugin of plugins) {
    for (const skill of plugin.contents?.skills ?? []) {
      pluginSkillNames.set(skill.name, plugin.name)
    }
  }

  const skillDuplicates: SkillDuplicate[] = standaloneSkills
    .filter((s) => pluginSkillNames.has(s.name))
    .map((s) => ({
      name: s.name,
      standaloneScope: s.scope,
      pluginName: pluginSkillNames.get(s.name)!,
    }))

  // 2. User/Project 동일 이름 중복
  const scopeDuplicates: ScopeDuplicate[] = []
  for (const items of [standaloneSkills, standaloneAgents]) {
    const byName = new Map<string, string[]>()
    for (const item of items) {
      const scopes = byName.get(item.name) ?? []
      scopes.push(item.scope)
      byName.set(item.name, scopes)
    }
    for (const [name, scopes] of byName) {
      if (scopes.length > 1) {
        scopeDuplicates.push({ name, type: items[0]?.type ?? "skill" })
      }
    }
  }

  return { skillDuplicates, scopeDuplicates }
}
```

### Step 4: 테스트 통과 확인

Run: `pnpm test tests/unit/duplicate-detection.test.ts`
Expected: PASS

### Step 5: UI에 경고 표시

대시보드 패널에서 중복이 감지된 아이템에 `⚠️` 배지 또는 경고 텍스트 추가:
- SkillsPanel: standalone skill이 plugin과 중복 시 `⚠️ plugin:이름과 중복` 표시
- 같은 이름이 User/Project 양쪽에 있으면 ScopeBadge 옆에 경고 아이콘

기존 `ScopeBadge`의 `hasConflict` prop과 `AlertTriangle` 아이콘 활용.

### Step 6: 전체 검증

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 통과

### 🔄 사용자 피드백 게이트

커밋 메시지 (승인 시): `feat(dashboard): add duplicate detection and warning indicators`

---

## 검증 체크리스트

모든 Task 완료 후 최종 확인:

- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 전체 통과
- [ ] `pnpm build` 성공
- [ ] Main Agent 선택기 작동 (헤더에서 Claude Code 표시)
- [ ] Skill/Agent 스코프 이동 작동 (User ↔ Project)
- [ ] Skill/Agent 스코프 복사 작동 (원본 유지 확인)
- [ ] 중복 감지 경고 표시 (plugin ↔ standalone, User ↔ Project)
- [ ] 기존 기능 정상 동작 (프로젝트 전환, 패널 표시, 상세 패널)

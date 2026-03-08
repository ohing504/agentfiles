# Phase 1A: Multi-Agent Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 멀티 에이전트 기반 구축 — AgentType/AgentConfig 타입, 에이전트 레지스트리, Main Agent 설정, 에이전트별 경로 추상화, AgentContext + 선택 UI

**Architecture:** skills.sh(Vercel) 네이밍을 그대로 따르되, agentfiles 고유 확장 필드(entities, configDir)를 추가. 기존 서비스 레이어의 하드코딩된 `.claude` 경로를 AgentConfig 기반으로 추상화. 설정은 기존 `~/.claude/agentfiles.json`에 `mainAgent` 필드 추가.

**Tech Stack:** TypeScript, Vitest, TanStack Start (createServerFn), React 19, TanStack Query, shadcn/ui

**Design Doc:** `docs/plans/2026-03-06-v2-multi-agent-redesign-design.md`

---

## Dependency Graph

```text
Commit 1: Types ─────────────────────────┐
                                          ▼
Commit 2: Agent Registry ───────► Commit 3: Main Agent Settings
                                          │
                                          ▼
                             Commit 4: Agent-aware Services
                                          │
                                          ▼
                             Commit 5: Agent-aware Server Fns
                                          │
                                          ▼
                             Commit 6: AgentContext + Selector UI
                                          │
                                          ▼
                             Commit 7: Wire Features to Agent Context
```

---

## Commit 1: feat(types): add multi-agent type definitions

**Files:**
- Modify: `src/shared/types.ts`

**목적:** AgentType, AgentConfig, EntityType 타입 정의. 기존 코드에 영향 없이 타입만 추가.

### Step 1: shared/types.ts에 타입 추가

`src/shared/types.ts` 하단에 다음 타입들을 추가:

```typescript
// ── Multi-Agent (skills.sh 네이밍 준수) ──

/** skills.sh 호환 에이전트 타입 (Phase 1: claude-code, codex만 사용) */
export type AgentType = "claude-code" | "codex"

/** agentfiles가 다루는 엔티티 종류 */
export type EntityType = "skill" | "agent" | "command" | "hook" | "plugin" | "mcp"

/** skills.sh AgentConfig 호환 + agentfiles 확장 */
export interface AgentConfig {
  name: AgentType
  displayName: string
  /** 프로젝트 상대 경로 (e.g. ".claude/skills") */
  skillsDir: string
  /** 글로벌 절대 경로 (e.g. "~/.claude/skills"). undefined이면 글로벌 미지원 */
  globalSkillsDir: string | undefined
  /** 에이전트 홈 디렉토리 존재 여부로 설치 감지 */
  detectInstalled: () => Promise<boolean>
  /** universal 에이전트 목록에 표시 여부 */
  showInUniversalList?: boolean
  // ── agentfiles 확장 필드 ──
  /** 프로젝트 기본 설정 디렉토리 (e.g. ".claude") */
  configDir: string
  /** 글로벌 기본 설정 디렉토리 (e.g. "~/.claude") */
  globalConfigDir: string | undefined
  /** 이 에이전트가 지원하는 엔티티 종류 */
  entities: EntityType[]
}
```

Scope enum에 `"shared"` 추가 (향후 `~/.agents/` 지원):

```typescript
export const scopeSchema = z.enum(["user", "project", "local", "managed", "shared"])
```

`AgentfilesConfig` 타입 추가 (기존 `ProjectsConfig` 확장):

```typescript
export interface AgentfilesConfig {
  projects: Project[]
  activeProject: string | null
  /** 현재 선택된 메인 에이전트 */
  mainAgent?: AgentType
}
```

### Step 2: ProjectsConfig → AgentfilesConfig 마이그레이션

기존 `ProjectsConfig`를 `AgentfilesConfig`로 rename. `ProjectsConfig`는 alias로 남겨서 import 깨짐 방지:

```typescript
/** @deprecated Use AgentfilesConfig */
export type ProjectsConfig = AgentfilesConfig
```

### Step 3: typecheck 확인

```bash
pnpm typecheck
```

기존 코드가 `ProjectsConfig`를 import하는 곳이 모두 alias로 동작하므로 깨지지 않아야 함.

### Step 4: 커밋

```bash
git add src/shared/types.ts
git commit -m "feat(types): add AgentType, AgentConfig, and EntityType for multi-agent support"
```

---

## Commit 2: feat(services): add agent registry with detection

**Files:**
- Create: `src/services/agent-registry.ts`
- Create: `src/services/agent-registry.test.ts`

**목적:** claude-code와 codex 에이전트 정의, 설치 감지 함수.

### Step 1: 에이전트 레지스트리 구현

`src/services/agent-registry.ts`:

```typescript
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { AgentConfig, AgentType, EntityType } from "@/shared/types"

const homedir = os.homedir()

/** 모든 지원 에이전트 정의 (skills.sh 네이밍 준수) */
export const agents: Record<AgentType, AgentConfig> = {
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: path.join(homedir, ".claude", "skills"),
    configDir: ".claude",
    globalConfigDir: path.join(homedir, ".claude"),
    detectInstalled: () => dirExists(path.join(homedir, ".claude")),
    showInUniversalList: false,
    entities: ["skill", "agent", "command", "hook", "plugin", "mcp"],
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: path.join(homedir, ".agents", "skills"),
    configDir: ".codex",
    globalConfigDir: path.join(homedir, ".codex"),
    detectInstalled: () => dirExists(path.join(homedir, ".codex")),
    showInUniversalList: true,
    entities: ["skill"],
  },
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/** 설치된 에이전트만 반환 */
export async function detectInstalledAgents(): Promise<AgentConfig[]> {
  const results = await Promise.all(
    Object.values(agents).map(async (agent) => {
      const installed = await agent.detectInstalled()
      return installed ? agent : null
    }),
  )
  return results.filter((a): a is AgentConfig => a !== null)
}

/** 에이전트 설정 조회 */
export function getAgentConfig(type: AgentType): AgentConfig {
  return agents[type]
}

/** universal 에이전트 여부 (skillsDir이 .agents/) */
export function isUniversalAgent(type: AgentType): boolean {
  return agents[type].skillsDir.startsWith(".agents/")
}

/** 에이전트가 특정 엔티티를 지원하는지 */
export function agentSupportsEntity(type: AgentType, entity: EntityType): boolean {
  return agents[type].entities.includes(entity)
}

/** 글로벌 설정 디렉토리 (절대 경로) */
export function getAgentGlobalDir(type: AgentType): string | undefined {
  return agents[type].globalConfigDir
}

/** 프로젝트 설정 디렉토리 (절대 경로) */
export function getAgentProjectDir(type: AgentType, projectPath: string): string {
  return path.join(projectPath, agents[type].configDir)
}
```

### Step 2: 테스트 작성

`src/services/agent-registry.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest"
import {
  agents,
  getAgentConfig,
  isUniversalAgent,
  agentSupportsEntity,
  getAgentGlobalDir,
  getAgentProjectDir,
} from "./agent-registry"

describe("agent-registry", () => {
  it("should have claude-code and codex defined", () => {
    expect(agents["claude-code"]).toBeDefined()
    expect(agents["codex"]).toBeDefined()
  })

  it("getAgentConfig returns correct config", () => {
    const claude = getAgentConfig("claude-code")
    expect(claude.displayName).toBe("Claude Code")
    expect(claude.configDir).toBe(".claude")
  })

  it("isUniversalAgent correctly identifies", () => {
    expect(isUniversalAgent("claude-code")).toBe(false)
    expect(isUniversalAgent("codex")).toBe(true)
  })

  it("agentSupportsEntity checks entity support", () => {
    expect(agentSupportsEntity("claude-code", "hook")).toBe(true)
    expect(agentSupportsEntity("codex", "hook")).toBe(false)
    expect(agentSupportsEntity("codex", "skill")).toBe(true)
  })

  it("getAgentGlobalDir returns absolute paths", () => {
    const dir = getAgentGlobalDir("claude-code")
    expect(dir).toContain(".claude")
    expect(dir).toMatch(/^\//)
  })

  it("getAgentProjectDir constructs project path", () => {
    const dir = getAgentProjectDir("claude-code", "/home/user/project")
    expect(dir).toBe("/home/user/project/.claude")
  })
})
```

### Step 3: 테스트 실행

```bash
pnpm test -- src/services/agent-registry.test.ts
```

### Step 4: 커밋

```bash
git add src/services/agent-registry.ts src/services/agent-registry.test.ts
git commit -m "feat(services): add agent registry with claude-code and codex support"
```

---

## Commit 3: feat(services): add mainAgent to app settings

**Files:**
- Modify: `src/services/project-store.ts`
- Modify: `src/server/projects.ts`

**목적:** `agentfiles.json`에 `mainAgent` 필드 추가. 서버 함수로 읽기/쓰기 지원.

### Step 1: project-store.ts 수정

`AgentfilesConfig` 사용하도록 변경 (타입만 바뀜, 기존 필드 호환):

```typescript
import type { AgentfilesConfig, AgentType } from "@/shared/types"

export async function readProjectsConfig(): Promise<AgentfilesConfig> {
  // 기존 코드 동일, 반환 타입만 AgentfilesConfig
  // mainAgent가 없으면 기본값 적용하지 않음 (호출자가 처리)
}
```

### Step 2: server/projects.ts에 mainAgent 함수 추가

```typescript
export const getMainAgentFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { readProjectsConfig } = await import("@/services/project-store")
    const config = await readProjectsConfig()
    return { mainAgent: config.mainAgent ?? "claude-code" }
  },
)

export const setMainAgentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { agent: string }) => data)
  .handler(async ({ data }: { data: { agent: string } }) => {
    const { readProjectsConfig, writeProjectsConfig } = await import(
      "@/services/project-store"
    )
    const config = await readProjectsConfig()
    config.mainAgent = data.agent as AgentType
    await writeProjectsConfig(config)
    return { success: true }
  })
```

### Step 3: getProjectsFn 응답에 mainAgent 포함

기존 `getProjectsFn`의 반환값에 `mainAgent` 추가:

```typescript
return {
  projects,
  activeProject: config.activeProject,
  homedir: os.homedir(),
  mainAgent: config.mainAgent ?? "claude-code",
}
```

### Step 4: 에이전트 감지 서버 함수 추가

```typescript
export const getInstalledAgentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { detectInstalledAgents } = await import("@/services/agent-registry")
    const installed = await detectInstalledAgents()
    // detectInstalled는 함수라 직렬화 불가 → 필요한 필드만 반환
    return installed.map(({ name, displayName, entities, showInUniversalList }) => ({
      name,
      displayName,
      entities,
      showInUniversalList,
    }))
  },
)
```

### Step 5: typecheck + 테스트

```bash
pnpm typecheck
pnpm test
```

### Step 6: 커밋

```bash
git add src/services/project-store.ts src/server/projects.ts src/shared/types.ts
git commit -m "feat(services): add mainAgent setting and agent detection server functions"
```

---

## Commit 4: feat(services): agent-aware path resolution and file scanning

**Files:**
- Modify: `src/services/config-service.ts`
- Modify: `src/services/agent-file-service.ts`
- Modify: `src/services/overview-service.ts`
- Modify: `src/server/config.ts`

**목적:** 서비스 레이어의 경로 헬퍼가 AgentType을 받아서 해당 에이전트의 디렉토리를 사용하도록 변경. 기존 호출은 기본값 `"claude-code"`로 하위 호환.

### Step 1: config-service.ts 경로 헬퍼 확장

```typescript
import type { AgentType } from "@/shared/types"
import { getAgentGlobalDir, getAgentProjectDir } from "./agent-registry"

// 기존 함수 유지 (하위 호환)
export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".claude")
}

export function getProjectConfigPath(projectPath?: string): string {
  return path.join(projectPath ?? process.cwd(), ".claude")
}

// 에이전트 인식 버전 추가
export function getGlobalConfigPathForAgent(agentType: AgentType): string | undefined {
  return getAgentGlobalDir(agentType)
}

export function getProjectConfigPathForAgent(
  agentType: AgentType,
  projectPath?: string,
): string {
  return getAgentProjectDir(agentType, projectPath ?? process.cwd())
}
```

### Step 2: agent-file-service.ts에 agentType 매개변수 추가

`getAgentFiles` 함수에 선택적 `agentType` 매개변수 추가:

```typescript
import type { AgentType } from "@/shared/types"
import {
  getGlobalConfigPathForAgent,
  getProjectConfigPathForAgent,
} from "./config-service"

export async function getAgentFiles(
  type: AgentFile["type"],
  projectPath?: string,
  agentType?: AgentType,
): Promise<AgentFile[]> {
  // agentType이 주어지면 해당 에이전트 경로 사용
  const globalBase = agentType
    ? getGlobalConfigPathForAgent(agentType)
    : getGlobalConfigPath()
  const projectBase = agentType
    ? getProjectConfigPathForAgent(agentType, projectPath)
    : getProjectConfigPath(projectPath)

  // globalBase가 undefined이면 글로벌 스캔 건너뜀
  // 나머지 로직은 기존과 동일
}
```

기존 호출자는 `agentType` 전달하지 않으므로 기존 동작 유지.

### Step 3: overview-service.ts에 agentType 추가

```typescript
export async function getOverview(
  projectPath?: string,
  agentType?: AgentType,
): Promise<Overview> {
  // 각 getAgentFiles 호출에 agentType 전달
  // agentType이 주어지면 해당 에이전트가 지원하지 않는 엔티티는 0으로 반환
}
```

### Step 4: server/config.ts 동일하게 확장

`server/config.ts`에도 에이전트 인식 함수 추가 (config-service의 래퍼):

```typescript
export { getGlobalConfigPathForAgent, getProjectConfigPathForAgent } from "@/services/config-service"
```

### Step 5: typecheck + 기존 테스트 통과 확인

```bash
pnpm typecheck
pnpm test
```

기존 호출자가 `agentType`을 전달하지 않으므로 모든 기존 테스트가 통과해야 함.

### Step 6: 커밋

```bash
git add src/services/config-service.ts src/services/agent-file-service.ts \
        src/services/overview-service.ts src/server/config.ts
git commit -m "feat(services): add agent-aware path resolution and file scanning"
```

---

## Commit 5: feat(server): pass agentType through server functions

**Files:**
- Modify: `src/server/items.ts`
- Modify: `src/server/overview.ts`
- Modify: `src/server/claude-md.ts`

**목적:** 서버 함수들이 `agentType` 매개변수를 받아 서비스에 전달. 클라이언트가 Main Agent에 따라 다른 데이터를 받을 수 있도록.

### Step 1: overview.ts 수정

```typescript
export const getOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath?: string; agentType?: string }) => data)
  .handler(async ({ data }) => {
    const { getOverview } = await import("@/services/overview-service")
    return getOverview(data.projectPath, data.agentType as AgentType | undefined)
  })
```

### Step 2: items.ts 수정

`getItemsFn`, `getItemFn`, `saveItemFn`, `deleteItemFn` 모두 `agentType` 추가:

```typescript
export const getItemsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { type: string; projectPath?: string; agentType?: string }) => data)
  .handler(async ({ data }) => {
    const { getAgentFiles } = await import("@/services/agent-file-service")
    return getAgentFiles(
      data.type as AgentFile["type"],
      data.projectPath,
      data.agentType as AgentType | undefined,
    )
  })
```

### Step 3: claude-md.ts 수정

Claude Code 전용 엔티티이므로 agentType 매개변수는 받되 현재는 claude-code만 지원. 향후 다른 에이전트의 설정 파일(예: AGENTS.md)을 읽을 때 확장.

### Step 4: typecheck + 테스트

```bash
pnpm typecheck
pnpm test
```

### Step 5: 커밋

```bash
git add src/server/items.ts src/server/overview.ts src/server/claude-md.ts
git commit -m "feat(server): pass agentType through server functions"
```

---

## Commit 6: feat(ui): add AgentContext provider and MainAgentSelector

**Files:**
- Create: `src/components/AgentContext.tsx`
- Create: `src/components/MainAgentSelector.tsx`
- Modify: `src/routes/__root.tsx` (AgentProvider 추가)
- Modify: `src/components/layout/Sidebar.tsx` (선택기 배치)
- Modify: `src/hooks/use-projects.ts` (mainAgent 반환)
- Modify: `src/lib/query-keys.ts` (agents 키 추가)

**목적:** Main Agent 상태를 앱 전역에서 사용할 수 있도록 React Context 제공. 사이드바에 에이전트 선택기 배치.

### Step 1: AgentContext.tsx 생성

```typescript
import { createContext, useContext } from "react"
import type { AgentType, EntityType } from "@/shared/types"

interface InstalledAgent {
  name: AgentType
  displayName: string
  entities: EntityType[]
}

interface AgentContextValue {
  mainAgent: AgentType
  installedAgents: InstalledAgent[]
  setMainAgent: (agent: AgentType) => void
  /** 현재 Main Agent가 특정 엔티티를 지원하는지 */
  supportsEntity: (entity: EntityType) => boolean
  isLoading: boolean
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: React.ReactNode }) {
  // useProjects에서 mainAgent 받기 (Commit 3에서 추가됨)
  // getInstalledAgentsFn으로 설치된 에이전트 목록 가져오기
  // setMainAgentFn으로 선택 변경
  // ...
}

export function useAgentContext() {
  const context = useContext(AgentContext)
  if (!context) throw new Error("useAgentContext must be used within AgentProvider")
  return context
}
```

### Step 2: MainAgentSelector.tsx 생성

shadcn/ui `DropdownMenu` 사용. ProjectSwitcher와 유사한 패턴:

```typescript
import { useAgentContext } from "./AgentContext"
// shadcn DropdownMenu 컴포넌트 사용
// 설치된 에이전트 목록 표시, 현재 선택된 에이전트 표시, 클릭으로 변경
```

### Step 3: __root.tsx에 AgentProvider 추가

```tsx
<ProjectProvider>
  <AgentProvider>    {/* 추가 */}
    <ErrorBoundary>
      ...
    </ErrorBoundary>
  </AgentProvider>
</ProjectProvider>
```

### Step 4: Sidebar에 MainAgentSelector 배치

사이드바 푸터 영역 또는 헤더 영역에 배치. ProjectSwitcher 아래:

```tsx
<SidebarHeader>
  <ProjectSwitcher />
  <MainAgentSelector />   {/* 추가 */}
</SidebarHeader>
```

### Step 5: 사이드바 메뉴 필터링

현재 Main Agent가 지원하지 않는 엔티티의 메뉴 항목 숨기기:

```tsx
const { supportsEntity } = useAgentContext()

// Hooks 메뉴: claude-code만 지원
{supportsEntity("hook") && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link to="/hooks">...</Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

### Step 6: 확인

```bash
pnpm typecheck
pnpm dev  # 브라우저에서 확인
```

### Step 7: 커밋

```bash
git add src/components/AgentContext.tsx src/components/MainAgentSelector.tsx \
        src/routes/__root.tsx src/components/layout/Sidebar.tsx \
        src/hooks/use-projects.ts src/lib/query-keys.ts
git commit -m "feat(ui): add AgentContext provider and MainAgentSelector"
```

---

## Commit 7: feat(ui): wire features to use AgentContext

**Files:**
- Modify: `src/hooks/use-config.ts`
- Modify: `src/features/dashboard/components/ProjectOverviewGrid.tsx`
- Modify: `src/features/skills-editor/api/skills.queries.ts`
- Modify: `src/features/agents-editor/api/agents.queries.ts`
- Modify: `src/features/hooks-editor/api/hooks.queries.ts`

**목적:** React Query 훅들이 현재 Main Agent를 서버 함수에 전달하도록 연결. 대시보드와 에디터들이 Main Agent에 따라 데이터를 가져오도록.

### Step 1: use-config.ts의 useOverview 수정

```typescript
export function useOverview() {
  const { mainAgent } = useAgentContext()
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.overview.scoped(activeProjectPath, mainAgent),
    queryFn: () => getOverviewFn({ data: { projectPath: activeProjectPath, agentType: mainAgent } }),
    ...FREQUENT_REFETCH,
  })
}
```

### Step 2: useAgentFiles 수정

```typescript
export function useAgentFiles(type: AgentFile["type"]) {
  const { mainAgent } = useAgentContext()
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.agentFiles.byType(type, activeProjectPath, mainAgent),
    queryFn: () => getItemsFn({ data: { type, projectPath: activeProjectPath, agentType: mainAgent } }),
    ...INFREQUENT_REFETCH,
  })
}
```

### Step 3: query-keys 업데이트

쿼리 키에 `agentType` 포함하여 에이전트 변경 시 자동 refetch:

```typescript
overview: {
  all: ["overview"] as const,
  scoped: (projectPath?: string, agentType?: string) =>
    ["overview", projectPath, agentType] as const,
},
agentFiles: {
  all: ["agent-files"] as const,
  byType: (type: string, projectPath?: string, agentType?: string) =>
    ["agent-files", type, projectPath, agentType] as const,
},
```

### Step 4: 대시보드 패널들 확인

`ProjectOverviewGrid`가 `useOverview()`를 사용하므로 자동으로 Main Agent 데이터를 표시. 단, Main Agent가 지원하지 않는 패널은 숨기기:

```tsx
const { supportsEntity } = useAgentContext()

// HooksPanel: claude-code만
{supportsEntity("hook") && <HooksPanel ... />}
```

### Step 5: 전체 테스트 + 빌드

```bash
pnpm typecheck
pnpm test
pnpm build
```

### Step 6: 커밋

```bash
git add src/hooks/use-config.ts src/lib/query-keys.ts \
        src/features/dashboard/components/ProjectOverviewGrid.tsx \
        src/features/skills-editor/api/skills.queries.ts \
        src/features/agents-editor/api/agents.queries.ts \
        src/features/hooks-editor/api/hooks.queries.ts
git commit -m "feat(ui): wire all features to use AgentContext for multi-agent support"
```

---

## 검증 기준

모든 커밋 완료 후 다음이 동작해야 함:

1. **Main Agent 선택기** — 사이드바에서 Claude Code / Codex 전환 가능
2. **에이전트별 데이터 표시** — Codex 선택 시 Skills만 표시, Hooks/Plugins/MCP 숨김
3. **에이전트별 경로** — Codex 선택 시 `~/.agents/skills/` 또는 `~/.codex/skills/` 스캔
4. **설정 저장** — Main Agent 선택이 `~/.claude/agentfiles.json`에 persist
5. **기존 기능 유지** — Claude Code 선택 시 v1과 동일하게 동작
6. **typecheck + test + build** 모두 통과

---

## 이후 작업 (별도 계획)

- **Phase 1B: Scope Model Extension** — `shared` 스코프 구현 (`~/.agents/` 스캔, symlink 출처 표시)
- **Phase 1C: UI Redesign** — 전면 레이아웃 재설계 (Codex App + Claude Desktop 참고)
- **Phase 2: skills.sh 전체 프레임워크 설계**

---

*2026-03-07 작성 | Design: docs/plans/2026-03-06-v2-multi-agent-redesign-design.md*

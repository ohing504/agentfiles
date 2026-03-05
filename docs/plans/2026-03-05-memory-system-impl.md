# Memory System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Claude Code의 프로젝트별 메모리 파일을 대시보드에서 읽기 전용으로 조회할 수 있게 한다.

**Architecture:** memory-service가 `~/.claude/projects/{slug}/memory/` 디렉토리를 스캔하여 MemoryFile[] 반환. Server Function으로 래핑 후 React Query 훅으로 대시보드 패널에 표시.

**Tech Stack:** TypeScript, TanStack Start (Server Functions), React Query, Vitest

---

### Task 1: MemoryFile 타입 추가

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: types.ts에 MemoryFile 인터페이스 추가**

`Overview` 인터페이스 위에 추가:

```typescript
// ── Memory ──
export interface MemoryFile {
  name: string // "MEMORY.md"
  path: string // 절대 경로
  size: number
  lastModified: string // ISO 8601
  content: string // 마크다운 원문
}
```

**Step 2: Overview 인터페이스에 memory 필드 추가**

```typescript
export interface Overview {
  // ... 기존 필드 유지
  conflictCount: number
  memory: { total: number }
}
```

**Step 3: typecheck 실행**

Run: `pnpm typecheck`
Expected: overview-service.ts에서 memory 필드 누락 에러 (Task 3에서 해결)

---

### Task 2: memory-service.ts 작성 + 테스트

**Files:**
- Create: `src/services/memory-service.ts`
- Create: `src/services/memory-service.test.ts`

**Step 1: 테스트 작성**

```typescript
import { describe, expect, it, vi } from "vitest"

// fs mock은 vi.mock으로 설정
vi.mock("node:fs/promises")

import fs from "node:fs/promises"
import os from "node:os"
import {
  getMemoryDir,
  getMemoryFiles,
  projectPathToSlug,
} from "@/services/memory-service"

describe("projectPathToSlug", () => {
  it("converts absolute path to slug", () => {
    expect(projectPathToSlug("/Users/ohing/workspace/financial")).toBe(
      "-Users-ohing-workspace-financial",
    )
  })

  it("handles root path", () => {
    expect(projectPathToSlug("/")).toBe("-")
  })
})

describe("getMemoryDir", () => {
  it("returns correct memory directory path", () => {
    const dir = getMemoryDir("/Users/ohing/workspace/financial")
    expect(dir).toBe(
      `${os.homedir()}/.claude/projects/-Users-ohing-workspace-financial/memory`,
    )
  })
})

describe("getMemoryFiles", () => {
  it("returns empty array when directory does not exist", async () => {
    vi.mocked(fs.readdir).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    )
    const result = await getMemoryFiles("/nonexistent/path")
    expect(result).toEqual([])
  })

  it("returns memory files with content", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "MEMORY.md", isFile: () => true } as any,
      { name: "testing.md", isFile: () => true } as any,
      { name: "not-md.txt", isFile: () => true } as any,
    ])
    vi.mocked(fs.stat).mockResolvedValue({
      size: 100,
      mtime: new Date("2026-03-05T00:00:00Z"),
    } as any)
    vi.mocked(fs.readFile).mockResolvedValue("# Memory content")

    const result = await getMemoryFiles("/Users/ohing/workspace/test")
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("MEMORY.md")
    expect(result[0].content).toBe("# Memory content")
    expect(result[1].name).toBe("testing.md")
  })
})
```

**Step 2: 테스트 실패 확인**

Run: `pnpm test src/services/memory-service.test.ts`
Expected: FAIL — module not found

**Step 3: memory-service.ts 구현**

```typescript
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { MemoryFile } from "@/shared/types"

/**
 * 프로젝트 절대경로 → Claude Code slug 변환
 * "/Users/ohing/workspace/financial" → "-Users-ohing-workspace-financial"
 */
export function projectPathToSlug(projectPath: string): string {
  return projectPath.replaceAll("/", "-")
}

/** 메모리 디렉토리 절대경로 */
export function getMemoryDir(projectPath: string): string {
  const slug = projectPathToSlug(projectPath)
  return path.join(os.homedir(), ".claude", "projects", slug, "memory")
}

/** 메모리 파일 목록 + 내용 조회 */
export async function getMemoryFiles(
  projectPath: string,
): Promise<MemoryFile[]> {
  const memoryDir = getMemoryDir(projectPath)

  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(memoryDir, { withFileTypes: true })
  } catch {
    return []
  }

  const mdFiles = entries.filter(
    (e) => e.isFile() && e.name.endsWith(".md"),
  )

  const results = await Promise.all(
    mdFiles.map(async (entry) => {
      const filePath = path.join(memoryDir, entry.name)
      const [content, stat] = await Promise.all([
        fs.readFile(filePath, "utf-8"),
        fs.stat(filePath),
      ])
      return {
        name: entry.name,
        path: filePath,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        content,
      }
    }),
  )

  // MEMORY.md를 항상 첫 번째로 정렬
  return results.sort((a, b) => {
    if (a.name === "MEMORY.md") return -1
    if (b.name === "MEMORY.md") return 1
    return a.name.localeCompare(b.name)
  })
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm test src/services/memory-service.test.ts`
Expected: PASS (3 tests)

---

### Task 3: overview-service.ts에 memory 카운트 추가

**Files:**
- Modify: `src/services/overview-service.ts`

**Step 1: memory 카운트 로직 추가**

import 추가:
```typescript
import { getMemoryFiles } from "@/services/memory-service"
```

`getOverview` 함수의 `Promise.all`에 memory 조회 추가:
```typescript
// projectPath가 있을 때만 메모리 파일 조회
const memoryFiles = projectPath ? await getMemoryFiles(projectPath) : []
```

return 객체에 추가:
```typescript
return {
  // ... 기존 필드
  conflictCount,
  memory: { total: memoryFiles.length },
}
```

**Step 2: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 4: Server Function + React Query 훅

**Files:**
- Create: `src/server/memory.ts`
- Modify: `src/hooks/use-config.ts`
- Modify: `src/lib/query-keys.ts`

**Step 1: Server Function 작성**

```typescript
import { createServerFn } from "@tanstack/react-start"

export const getMemoryFilesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { projectPath: string }) => data)
  .handler(async ({ data }) => {
    const { getMemoryFiles } = await import("@/services/memory-service")
    return getMemoryFiles(data.projectPath)
  })
```

**Step 2: query-keys.ts에 memory 키 추가**

```typescript
export const queryKeys = {
  // ... 기존 키 유지
  memory: {
    all: ["memory"] as const,
    byProject: (projectPath?: string) =>
      [...queryKeys.memory.all, projectPath] as const,
  },
}
```

**Step 3: use-config.ts에 useMemoryFiles 훅 추가**

파일 하단에 추가:

```typescript
// ── Memory Files ─────────────────────────────────────────────────────────────

export function useMemoryFiles() {
  const { activeProjectPath } = useProjectContext()

  return useQuery({
    queryKey: queryKeys.memory.byProject(activeProjectPath),
    queryFn: async () => {
      if (!activeProjectPath) return []
      const { getMemoryFilesFn } = await import("@/server/memory")
      return getMemoryFilesFn({ data: { projectPath: activeProjectPath } })
    },
    enabled: !!activeProjectPath,
    ...INFREQUENT_REFETCH,
  })
}
```

**Step 4: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 5: DashboardDetailTarget 확장 + MemoryDetailPanel

**Files:**
- Modify: `src/features/dashboard/types.ts`
- Create: `src/features/dashboard/components/MemoryDetailPanel.tsx`

**Step 1: DashboardDetailTarget에 memory 타입 추가**

`src/features/dashboard/types.ts`에 import 추가 후 union에 memory 추가:

```typescript
import type {
  AgentFile,
  HookEntry,
  HookScope,
  McpServer,
  MemoryFile,
  Plugin,
} from "@/shared/types"

export type DashboardDetailTarget =
  | { type: "plugin"; plugin: Plugin }
  | { type: "skill"; skill: AgentFile }
  | { type: "agent"; agent: AgentFile }
  | { type: "mcp"; server: McpServer }
  | {
      type: "hook"
      hook: HookEntry
      event: string
      matcher?: string
      scope?: HookScope
    }
  | { type: "memory"; file: MemoryFile }
  | null
```

**Step 2: MemoryDetailPanel 작성**

```tsx
import type { MemoryFile } from "@/shared/types"

interface MemoryDetailPanelProps {
  file: MemoryFile
}

export function MemoryDetailPanel({ file }: MemoryDetailPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">{file.name}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
          {file.path}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
          {file.content}
        </pre>
      </div>
    </div>
  )
}
```

**Step 3: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 6: MemoryPanel 대시보드 패널

**Files:**
- Create: `src/features/dashboard/components/MemoryPanel.tsx`

**Step 1: MemoryPanel 작성**

기존 패널 패턴(SkillsPanel, LspServersPanel)을 따른다:

```tsx
import { BrainIcon } from "lucide-react"
import { ListItem } from "@/components/ui/list-item"
import { useMemoryFiles } from "@/hooks/use-config"
import { formatBytes } from "@/lib/format"
import type { DashboardDetailTarget } from "../types"
import { OverviewPanel } from "./OverviewPanel"

interface MemoryPanelProps {
  onSelectItem?: (target: DashboardDetailTarget) => void
}

export function MemoryPanel({ onSelectItem }: MemoryPanelProps) {
  const { data: files = [] } = useMemoryFiles()

  return (
    <OverviewPanel title="Memory" count={files.length}>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">
          No memory files
        </p>
      ) : (
        <div>
          {files.map((file) => (
            <ListItem
              key={file.name}
              icon={BrainIcon}
              label={file.name}
              trailing={
                <span className="text-[10px] text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              }
              onClick={() =>
                onSelectItem?.({ type: "memory", file })
              }
            />
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

**Step 2: `formatBytes` 유틸리티 존재 확인**

`src/lib/format.ts`에 `formatBytes`가 없으면 추가:

```typescript
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}
```

**Step 3: typecheck 통과 확인**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 7: ProjectOverviewGrid에 MemoryPanel 통합

**Files:**
- Modify: `src/features/dashboard/components/ProjectOverviewGrid.tsx`

**Step 1: import 추가**

```typescript
import { useProjectContext } from "@/components/ProjectContext"
import { MemoryDetailPanel } from "./MemoryDetailPanel"
import { MemoryPanel } from "./MemoryPanel"
```

**Step 2: DetailPanelContent에 memory case 추가**

switch문에 추가:
```typescript
case "memory":
  return <MemoryDetailPanel file={target.file} />
```

**Step 3: 그리드에 MemoryPanel 추가**

하단 그리드(`h-[160px]`) 아래에 프로젝트 선택 시에만 표시되는 MemoryPanel 추가:

```tsx
{/* 기존 3x2 그리드 유지 */}
<div className="grid grid-cols-3 gap-3 h-[160px] shrink-0">
  <HooksPanel ... />
  <AgentsPanel ... />
  <LspServersPanel />
</div>

{/* Memory — 프로젝트 선택 시에만 */}
{activeProjectPath && (
  <div className="h-[160px] shrink-0">
    <MemoryPanel onSelectItem={setSelected} />
  </div>
)}
```

**Step 4: 빌드 + lint + typecheck 전체 확인**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: ALL PASS

---

### Task 8: 최종 검증 + 커밋

**Step 1: 전체 테스트 실행**

Run: `pnpm test`
Expected: ALL PASS

**Step 2: 개발 서버에서 육안 확인**

- 프로젝트 미선택 시 Memory 패널 미표시 확인
- 프로젝트 선택 시 Memory 패널 표시 + 파일 목록 확인
- 파일 클릭 시 우측 디테일 패널에 마크다운 내용 표시 확인

**Step 3: 커밋**

```bash
git add src/services/memory-service.ts src/services/memory-service.test.ts \
  src/server/memory.ts src/hooks/use-config.ts src/lib/query-keys.ts \
  src/shared/types.ts src/features/dashboard/types.ts \
  src/features/dashboard/components/MemoryPanel.tsx \
  src/features/dashboard/components/MemoryDetailPanel.tsx \
  src/features/dashboard/components/ProjectOverviewGrid.tsx \
  src/lib/format.ts src/services/overview-service.ts
git commit -m "feat(dashboard): add read-only memory files panel"
```

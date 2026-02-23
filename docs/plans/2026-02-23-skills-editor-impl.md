# Skills Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skills + legacy Commands를 통합 관리하는 전용 에디터 페이지(`/skills`)를 구현한다. frontmatter GUI 편집, 마크다운 프리뷰, 외부 에디터 연결 기능을 제공한다.

**Architecture:** 기존 `useAgentFiles("skill")`/`useAgentFiles("command")` 훅과 `getItemsFn`/`saveItemFn` 서버 함수를 재활용한다. Skills 디렉토리(`SKILL.md`) 인식을 위한 config-service 확장, react-markdown 프리뷰 컴포넌트, frontmatter 전용 저장 서버 함수를 추가하고, Hooks 에디터와 동일한 2-panel 레이아웃으로 SkillsPageContent를 구현한다.

**Tech Stack:** React 19, TanStack Start/Query/Form, react-markdown, remark-gfm, gray-matter, shadcn/ui, Zod, Tailwind CSS v4

---

### Task 1: react-markdown + remark-gfm 설치 및 MarkdownPreview 컴포넌트 생성

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/markdown-preview.tsx`

**Step 1: 패키지 설치**

Run: `pnpm add react-markdown remark-gfm`

**Step 2: MarkdownPreview 컴포넌트 생성**

Create `src/components/ui/markdown-preview.tsx`:

```tsx
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-sm prose-invert max-w-none
        prose-headings:text-foreground prose-p:text-muted-foreground
        prose-a:text-primary prose-strong:text-foreground
        prose-code:text-orange-300 prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-pre:bg-muted prose-pre:border prose-pre:border-border
        prose-table:text-muted-foreground
        prose-th:text-foreground prose-th:border-border
        prose-td:border-border
        prose-li:text-muted-foreground
        prose-hr:border-border
        ${className ?? ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
```

**Step 3: Tailwind typography 플러그인 설치**

Run: `pnpm add @tailwindcss/typography`

**Step 4: Tailwind CSS에 typography 플러그인 추가**

Modify `src/styles/app.css` — `@import "tailwindcss"` 아래에 추가:

```css
@plugin "@tailwindcss/typography";
```

**Step 5: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 6: Commit**

```text
feat(ui): add react-markdown preview component with typography plugin
```

---

### Task 2: Skills 디렉토리 구조 지원 (config-service 확장)

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/services/config-service.ts`

**Step 1: AgentFile 타입에 Skills 디렉토리 필드 추가**

Modify `src/shared/types.ts` — `AgentFile` 인터페이스에 추가:

```typescript
export interface AgentFile {
  // ... existing fields (name, scope, path, namespace, frontmatter, size, lastModified, type, isSymlink, symlinkTarget)
  isSkillDir?: boolean              // true if .claude/skills/<name>/SKILL.md format
  supportingFiles?: SupportingFile[] // other files in the skill directory
}

export interface SupportingFile {
  name: string
  relativePath: string  // relative to skill directory
  size: number
}
```

**Step 2: config-service에 scanSkillsDir 함수 추가**

Modify `src/services/config-service.ts` — `scanMdDir` 함수 아래에 추가:

```typescript
/**
 * Scan .claude/skills/ directory for both directory-based skills (SKILL.md)
 * and flat .md files (legacy format)
 */
export async function scanSkillsDir(
  basePath: string,
): Promise<AgentFile[]> {
  const results: AgentFile[] = []
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name)

      if (entry.isDirectory()) {
        // Check if directory contains SKILL.md
        const skillMdPath = path.join(fullPath, "SKILL.md")
        try {
          const stat = await fs.stat(skillMdPath)
          const content = await fs.readFile(skillMdPath, "utf-8")
          const parsed = matter(content)

          // Collect supporting files
          const supportingFiles: SupportingFile[] = []
          await collectSupportingFiles(fullPath, fullPath, supportingFiles)

          results.push({
            name: entry.name,
            scope: "global", // will be overridden by caller
            path: skillMdPath,
            frontmatter: parsed.data as AgentFile["frontmatter"],
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: true,
            supportingFiles,
          })
        } catch {
          // No SKILL.md, skip or scan as namespace
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Flat .md file (legacy or simple skill)
        try {
          const stat = await fs.stat(fullPath)
          const content = await fs.readFile(fullPath, "utf-8")
          const parsed = matter(content)
          results.push({
            name: entry.name.replace(/\.md$/, ""),
            scope: "global",
            path: fullPath,
            frontmatter: parsed.data as AgentFile["frontmatter"],
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            type: "skill",
            isSkillDir: false,
          })
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results
}

async function collectSupportingFiles(
  baseDir: string,
  currentDir: string,
  results: SupportingFile[],
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)
    if (entry.isFile() && entry.name !== "SKILL.md") {
      const stat = await fs.stat(fullPath)
      results.push({ name: entry.name, relativePath, size: stat.size })
    } else if (entry.isDirectory()) {
      await collectSupportingFiles(baseDir, fullPath, results)
    }
  }
}
```

**Step 3: getAgentFiles에서 skills 타입일 때 scanSkillsDir 사용**

Modify `src/services/config-service.ts` — `getAgentFiles` 함수 내부에서 `type === "skill"` 분기 추가:

```typescript
export async function getAgentFiles(
  type: AgentFile["type"],
  projectPath?: string,
): Promise<AgentFile[]> {
  const globalBase = getGlobalClaudeDir()
  let allFiles: AgentFile[] = []

  if (type === "skill") {
    // Use skills-aware scanner for directory-based skills
    const globalSkills = await scanSkillsDir(path.join(globalBase, "skills"))
    for (const f of globalSkills) f.scope = "global"
    allFiles.push(...globalSkills)

    // Also include legacy commands
    const globalCommands = await scanMdDir(path.join(globalBase, "commands"), "command")
    for (const f of globalCommands) f.scope = "global"
    allFiles.push(...globalCommands)

    if (projectPath) {
      const projectSkills = await scanSkillsDir(path.join(projectPath, ".claude", "skills"))
      for (const f of projectSkills) f.scope = "project"
      allFiles.push(...projectSkills)

      const projectCommands = await scanMdDir(path.join(projectPath, ".claude", "commands"), "command")
      for (const f of projectCommands) f.scope = "project"
      allFiles.push(...projectCommands)
    }
  } else {
    // Existing logic for agents, commands
    const globalFiles = await scanMdDir(path.join(globalBase, type === "agent" ? "agents" : type === "command" ? "commands" : "skills"), type)
    for (const f of globalFiles) f.scope = "global"
    allFiles.push(...globalFiles)

    if (projectPath) {
      const projectFiles = await scanMdDir(path.join(projectPath, ".claude", type === "agent" ? "agents" : type === "command" ? "commands" : "skills"), type)
      for (const f of projectFiles) f.scope = "project"
      allFiles.push(...projectFiles)
    }
  }

  return allFiles
}
```

주의: 기존 `getAgentFiles` 로직을 잘 확인하고 기존 동작을 깨지 않게 통합할 것. 실제 코드를 읽고 정확한 병합 위치를 결정.

**Step 4: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: 기존 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS (기존 config-service 테스트가 깨지지 않아야 함)

**Step 6: Commit**

```text
feat(service): add skills directory scanner with SKILL.md support
```

---

### Task 3: Frontmatter 저장 + 외부 에디터 서버 함수 추가

**Files:**
- Create: `src/server/skills.ts`

**Step 1: skills 서버 함수 파일 생성**

Create `src/server/skills.ts`:

```typescript
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

/**
 * Save only frontmatter of a skill/command file, preserving the body content
 */
export const saveFrontmatterFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      filePath: z.string().min(1),
      frontmatter: z.record(z.unknown()),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const matter = (await import("gray-matter")).default

    const raw = await fs.readFile(data.filePath, "utf-8")
    const parsed = matter(raw)

    // Replace frontmatter, keep body
    const updated = matter.stringify(parsed.content, data.frontmatter)
    await fs.writeFile(data.filePath, updated, "utf-8")
    return { success: true }
  })

/**
 * Open a file in an external editor (VS Code, Cursor, etc.)
 */
export const openInEditorFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      filePath: z.string().min(1),
      editor: z.enum(["code", "cursor"]),
    }),
  )
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execAsync = promisify(exec)
    try {
      await execAsync(`${data.editor} "${data.filePath}"`)
      return { success: true }
    } catch {
      return { success: false, error: `Failed to open ${data.editor}` }
    }
  })

/**
 * Open a directory in Finder/Explorer
 */
export const openFolderFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dirPath: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { exec } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execAsync = promisify(exec)
    try {
      // macOS: open, Linux: xdg-open, Windows: explorer
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open"
      await execAsync(`${cmd} "${data.dirPath}"`)
      return { success: true }
    } catch {
      return { success: false }
    }
  })

/**
 * Create a new skill directory with SKILL.md template
 */
export const createSkillFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
      scope: z.enum(["global", "project"]),
      description: z.string().optional(),
      projectPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const { getGlobalClaudeDir } = await import("@/server/config")

    const basePath =
      data.scope === "global"
        ? path.join(getGlobalClaudeDir(), "skills", data.name)
        : path.join(data.projectPath ?? ".", ".claude", "skills", data.name)

    const skillMdPath = path.join(basePath, "SKILL.md")

    // Create directory
    await fs.mkdir(basePath, { recursive: true })

    // Write template SKILL.md
    const frontmatter = [
      "---",
      `name: ${data.name}`,
      data.description ? `description: ${data.description}` : "description: ",
      "---",
    ].join("\n")

    const template = `${frontmatter}\n\n# ${data.name}\n\nSkill instructions here.\n`
    await fs.writeFile(skillMdPath, template, "utf-8")

    return { success: true, path: skillMdPath }
  })
```

**Step 2: Zod import 패턴 확인**

기존 서버 파일들의 Zod import 패턴을 확인하고 동일하게 맞출 것. `z.object` vs `.validator()` vs `.inputValidator()` — 기존 코드의 패턴을 따를 것.

**Step 3: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```text
feat(server): add skills server functions for frontmatter save and external editor
```

---

### Task 4: /skills 라우트 + SkillsPageContent 기본 구조

**Files:**
- Create: `src/routes/skills.tsx`
- Create: `src/components/pages/SkillsPageContent.tsx`

**Step 1: 라우트 파일 생성**

Create `src/routes/skills.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { SkillsPageContent } from "@/components/pages/SkillsPageContent"

export const Route = createFileRoute("/skills")({
  component: SkillsPageContent,
})
```

**Step 2: SkillsPageContent 기본 구조 생성**

Create `src/components/pages/SkillsPageContent.tsx`:

Hooks 에디터 패턴을 따르되, Skills에 맞게 조정:
- 좌측 트리 패널 (280px): Global/Project 스코프별 그룹 → Skills/Commands(legacy) 하위 그룹
- 우측 상세 패널: 선택된 skill 상세 또는 Empty 상태
- 검색 입력
- `useAgentFiles("skill")` 훅으로 데이터 조회

핵심 상태:
```typescript
const [selectedSkill, setSelectedSkill] = useState<AgentFile | null>(null)
const [searchQuery, setSearchQuery] = useState("")
const [addDialogOpen, setAddDialogOpen] = useState(false)
const [addDialogScope, setAddDialogScope] = useState<Scope>("global")
```

트리 구조:
- `TreeFolder` (Global) > `TreeFolder` (Skills) > `TreeFile` (각 skill)
- `TreeFolder` (Global) > `TreeFolder` (Commands [legacy]) > `TreeFile` (각 command)
- Project도 동일 (activeProjectPath가 있을 때만 표시)

Skills와 Commands 구분:
- `type === "skill"` && `isSkillDir === true` → Skills 그룹
- `type === "command"` → Commands (legacy) 그룹
- `type === "skill"` && `isSkillDir === false` → Skills 그룹 (flat file)

**Step 3: Empty 상태 UI**

선택된 skill이 없을 때 표시:
```tsx
<Empty
  icon={Code}
  title="No Skill Selected"
  description="Select a skill from the left panel to view its details."
/>
```

**Step 4: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Commit**

```text
feat(skills): add skills page route with 2-panel layout
```

---

### Task 5: SkillDetailPanel (Frontmatter GUI + 마크다운 프리뷰)

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: SkillDetailPanel 컴포넌트 구현**

SkillsPageContent.tsx 내부에 SkillDetailPanel 추가:

```tsx
function SkillDetailPanel({
  skill,
  content,
  onFrontmatterSave,
}: {
  skill: AgentFile
  content: string | null
  onFrontmatterSave: (frontmatter: Record<string, unknown>) => void
}) {
  // content를 gray-matter로 클라이언트 측에서도 파싱
  // (서버에서 이미 frontmatter 전달하지만, body 분리를 위해)
}
```

**상단: 메타데이터 헤더**
- skill 이름 + ScopeBadge + isSkillDir ? "📁" : "📄"
- 드롭다운: Open in VS Code / Open in Cursor / Open Folder / Delete

**중단: Frontmatter GUI 폼**

각 필드를 개별 컨트롤로 구현:

| 필드 | UI 컨트롤 |
|------|----------|
| `description` | `<Textarea>` (2줄) |
| `model` | `<Select>` (sonnet, haiku, opus) |
| `context` | `<Select>` (없음, fork) |
| `agent` | `<Select>` (Explore, Plan, general-purpose) + 직접 입력 |
| `allowed-tools` | `<Input>` (쉼표 구분 텍스트) |
| `argument-hint` | `<Input>` |
| `disable-model-invocation` | `<Switch>` |
| `user-invocable` | `<Switch>` |

- 변경 시 로컬 state 업데이트
- [Save] 버튼 클릭 시 `saveFrontmatterFn` 호출
- 저장 성공 시 toast + query invalidation

**하단: Body 프리뷰**

```tsx
<Separator />
<div className="space-y-2">
  <h4 className="text-sm font-medium text-muted-foreground">Body</h4>
  <MarkdownPreview content={bodyContent} />
</div>
```

**하단: Supporting Files** (isSkillDir일 때만)

```tsx
{skill.supportingFiles && skill.supportingFiles.length > 0 && (
  <>
    <Separator />
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Supporting Files</h4>
      {skill.supportingFiles.map((f) => (
        <div key={f.relativePath} className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3" />
          <span>{f.relativePath}</span>
          <span className="ml-auto">{formatFileSize(f.size)}</span>
        </div>
      ))}
    </div>
  </>
)}
```

**최하단: 액션 버튼**

```tsx
<div className="flex gap-2 pt-4">
  <Button variant="outline" size="sm" onClick={() => openInEditor("code")}>
    Open in VS Code
  </Button>
  <Button variant="outline" size="sm" onClick={() => openInEditor("cursor")}>
    Open in Cursor
  </Button>
  {skill.isSkillDir && (
    <Button variant="outline" size="sm" onClick={openFolder}>
      Open Folder
    </Button>
  )}
</div>
```

**Step 2: getItemFn으로 skill content 로드**

선택된 skill이 변경될 때 `getItemFn`으로 전체 content를 조회하고, 클라이언트에서 gray-matter로 frontmatter/body를 분리.

```tsx
const { data: itemDetail } = useQuery({
  queryKey: ["skill-detail", skill.name, skill.scope],
  queryFn: async () => {
    const { getItemFn } = await import("@/server/items")
    return getItemFn({ data: { type: skill.type, name: skill.name, scope: skill.scope, projectPath: activeProjectPath } })
  },
  enabled: !!skill,
})
```

주의: gray-matter는 서버사이드 전용이므로, 클라이언트에서 body 분리가 필요하면 간단한 frontmatter 파서를 사용하거나 서버 함수에서 body를 별도로 반환하도록 확장할 것.

**Step 3: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```text
feat(skills): add detail panel with frontmatter GUI and markdown preview
```

---

### Task 6: AddSkillDialog 구현

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: AddSkillDialog 컴포넌트 구현**

TanStack Form + Zod 패턴 (Hooks 에디터의 AddHookDialog 참고):

```tsx
const addSkillSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().optional(),
})

function AddSkillDialog({
  scope,
  onClose,
}: {
  scope: Scope
  onClose: () => void
}) {
  const form = useForm({
    defaultValues: { name: "", description: "" },
    validators: { onSubmit: addSkillSchema },
    onSubmit: async ({ value }) => {
      await createSkillFn({ data: { ...value, scope, projectPath: activeProjectPath } })
      toast.success(`Skill '${value.name}' created`)
      // Invalidate queries
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
          <DialogDescription>
            Creates a new skill directory with SKILL.md template.
          </DialogDescription>
        </DialogHeader>
        {/* Name input */}
        {/* Description textarea */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={form.handleSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add 버튼을 트리 패널의 각 scope 섹션에 연결**

각 스코프 헤더 옆에 `+` 버튼 → AddSkillDialog 열기

**Step 3: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```text
feat(skills): add create skill dialog with name and description
```

---

### Task 7: Sidebar 업데이트 + FilesPageContent 정리 + i18n

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/pages/FilesPageContent.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ko.json`

**Step 1: Sidebar에 Skills 메뉴 추가**

`src/components/Sidebar.tsx` — Hooks 메뉴 아래에 Skills 추가:

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild tooltip="Skills">
    <Link to="/skills" activeProps={{ "data-active": true }}>
      <Code />
      <span>Skills</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

아이콘: `Code` (lucide-react) 또는 `Sparkles` — 기존 skills 아이콘과 일치시킬 것

**Step 2: FilesPageContent에서 commands/skills 트리 섹션 제거**

Skills 전용 페이지가 생겼으므로 FilesPageContent에서 commands와 skills 트리 섹션을 제거하고, CLAUDE.md + agents 트리만 유지.

주의: agents도 나중에 별도 페이지로 빠질 예정이지만, 이번 스코프에서는 FilesPageContent에 유지.

**Step 3: i18n 메시지 추가**

`messages/en.json`에 추가:
```json
{
  "nav_skills": "Skills",
  "skills_empty_title": "No Skill Selected",
  "skills_empty_desc": "Select a skill from the left panel to view its details.",
  "skills_add_title": "Add Skill",
  "skills_add_desc": "Creates a new skill directory with SKILL.md template.",
  "skills_section_skills": "Skills",
  "skills_section_commands": "Commands (legacy)",
  "skills_open_vscode": "Open in VS Code",
  "skills_open_cursor": "Open in Cursor",
  "skills_open_folder": "Open Folder"
}
```

`messages/ko.json`에 동일 키 한국어 추가.

**Step 4: typecheck 확인**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Commit**

```text
feat(skills): add sidebar menu and clean up files page
```

---

### Task 8: 품질 검사 및 최종 확인

**Step 1: Lint**

Run: `pnpm lint`
Expected: PASS (필요 시 `pnpm lint:fix`)

**Step 2: TypeScript 타입 체크**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: 테스트**

Run: `pnpm test`
Expected: PASS (기존 테스트 깨지지 않음)

**Step 4: 빌드**

Run: `pnpm build`
Expected: PASS

**Step 5: 수동 확인 (dev 서버)**

`pnpm dev`로 개발 서버 실행 후:
- 사이드바에 Skills 메뉴 표시 확인
- `/skills` 페이지 접근 → 2-panel 레이아웃 표시
- 기존 skills/commands가 트리에 표시됨
- skill 선택 시 상세 패널에 frontmatter GUI + 마크다운 프리뷰 표시
- frontmatter 수정 → Save → 파일 반영 확인
- Open in VS Code 버튼 동작 확인
- Add Skill → 새 skill 디렉토리 생성 확인
- Files 페이지에서 commands/skills 섹션 제거 확인

**Step 6: 필요 시 lint fix 커밋**

```text
chore: fix lint issues
```

---

## Task Dependencies

```text
Task 1 (react-markdown) ───────┐
Task 2 (config-service 확장) ──┤── Task 4 (라우트 + 레이아웃)
Task 3 (서버 함수) ────────────┘        │
                                    Task 5 (상세 패널)
                                        │
                                    Task 6 (Add Dialog)
                                        │
                                    Task 7 (Sidebar + 정리)
                                        │
                                    Task 8 (품질 검사)
```

Tasks 1-3은 독립적으로 병렬 실행 가능. Task 4부터 순차적.

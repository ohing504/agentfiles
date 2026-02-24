# Skills Detail Panel Redesign Implementation Plan — COMPLETED

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skills 디테일 패널을 읽기 전용 뷰로 리디자인 — 메타 정보 상단, 마크다운 카드(프리뷰/소스/복사), frontmatter badge 표시

**Architecture:** 기존 `SkillDetailPanel`의 TanStack Form 기반 인라인 편집을 제거하고, 읽기 전용 뷰로 교체. shadcn Tabs로 프리뷰/소스 전환, Badge로 frontmatter 속성 표시.

**Tech Stack:** React, shadcn/ui (Tabs, Badge), lucide-react icons

---

### Task 1: Header 리팩토링 — 편집 드롭다운 버튼

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx:240-273`

**Step 1: 헤더의 `...` ghost 버튼을 "편집" outline 드롭다운으로 교체**

현재 코드 (lines 243-273):
```tsx
{/* Header bar */}
<div className="flex items-center justify-between px-4 h-12 shrink-0">
  <h2 className="text-sm font-semibold truncate min-w-0">{skill.name}</h2>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="size-8 shrink-0">
        <MoreHorizontal className="size-4" />
      </Button>
    </DropdownMenuTrigger>
    ...
  </DropdownMenu>
</div>
```

변경 후:
```tsx
{/* Header bar */}
<div className="flex items-center justify-between px-4 h-12 shrink-0">
  <h2 className="text-sm font-semibold truncate min-w-0">{skill.name}</h2>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
        <Pencil className="size-3.5" />
        {m.skills_edit()}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {/* VS Code, Cursor, Open Folder, separator, Delete — 기존 그대로 */}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Step 2: import 업데이트**

- lucide-react에서 `Pencil` 추가, `MoreHorizontal` 제거
- i18n: `messages/en.json`, `messages/ko.json`에 `skills_edit` 키 추가 (`"Edit"` / `"편집"`)

**Step 3: 검증**

Run: `pnpm typecheck && pnpm lint`

---

### Task 2: TanStack Form 코드 제거

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: form 관련 코드 제거**

제거 대상:
- import: `useForm`, `useStore` from `@tanstack/react-form`, `z` from `zod`
- `skillFrontmatterSchema` (lines 103-112)
- `SkillFrontmatterValues` type (line 114)
- `initFormValues` function (lines 116-130)
- `SkillDetailPanel` 내부: `form = useForm(...)`, `isSubmitting = useStore(...)`, `saveFrontmatterFn` 관련 onSubmit 로직
- import: `Save` from lucide-react, `Switch` from ui/switch
- import: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from ui/select
- import: `Field`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLabel` from ui/field (AddSkillDialog에서 여전히 사용하므로 유지 필요 확인)

주의: `AddSkillDialog`가 `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`, `z`, `Input`을 여전히 사용하므로 해당 import는 유지.

**Step 2: 검증**

Run: `pnpm typecheck && pnpm lint`

---

### Task 3: 메타 정보 섹션 추가

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: Frontmatter 섹션을 메타 정보 + description으로 교체**

기존 (lines 277-484, Frontmatter 섹션 + dl 그리드 + Save 버튼) 전체를 다음으로 교체:

```tsx
{/* Meta info */}
<section className="flex flex-col gap-3">
  <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{m.skills_scope()}</dt>
      <dd className="text-sm font-medium capitalize">{skill.scope}</dd>
    </div>
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{m.skills_last_updated()}</dt>
      <dd className="text-sm font-medium">{formatDate(skill.lastModified)}</dd>
    </div>
  </dl>

  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-muted-foreground">{m.skills_description()}</dt>
    <dd className="text-sm text-foreground">
      {skill.frontmatter?.description || (
        <span className="italic text-muted-foreground">No description</span>
      )}
    </dd>
  </div>
</section>

<Separator />
```

**Step 2: i18n 키 추가**

`messages/en.json` + `messages/ko.json`에 추가:
- `skills_scope`: `"Scope"` / `"스코프"`
- `skills_last_updated`: `"Last updated"` / `"마지막 업데이트"`
- `skills_description`: `"Description"` / `"설명"`

**Step 3: 검증**

Run: `pnpm typecheck && pnpm lint`

---

### Task 4: 마크다운 카드 — Tabs (프리뷰/소스) + 복사 버튼

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: viewMode state 추가**

```tsx
const [viewMode, setViewMode] = useState<"preview" | "source">("preview")
```

**Step 2: 기존 Body 섹션을 마크다운 카드로 교체**

기존 Body 섹션 (lines 488-501)을 다음으로 교체:

```tsx
{/* Markdown card */}
<section className="rounded-lg border bg-muted/30 overflow-hidden">
  <div className="flex items-center justify-end gap-1 p-2">
    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "source")}>
      <TabsList className="h-7">
        <TabsTrigger value="preview" className="gap-1 text-xs px-2 py-1">
          <Eye className="size-3.5" />
          {m.skills_preview()}
        </TabsTrigger>
        <TabsTrigger value="source" className="gap-1 text-xs px-2 py-1">
          <Code className="size-3.5" />
          {m.skills_source()}
        </TabsTrigger>
      </TabsList>
    </Tabs>
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={() => {
        navigator.clipboard.writeText(itemDetail?.content ?? "")
        toast.success(m.skills_copied())
      }}
    >
      <Copy className="size-3.5" />
    </Button>
  </div>

  <div className="px-4 pb-4">
    {detailLoading ? (
      <Skeleton className="h-32 w-full" />
    ) : viewMode === "preview" ? (
      <>
        {/* Frontmatter badges */}
        <FrontmatterBadges frontmatter={skill.frontmatter} />
        {body && (
          <>
            <Separator className="my-3" />
            <MarkdownPreview content={body} />
          </>
        )}
      </>
    ) : (
      <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
        {itemDetail?.content ?? ""}
      </pre>
    )}
  </div>
</section>
```

**Step 3: FrontmatterBadges 컴포넌트 추가**

`SkillDetailPanel` 위에 헬퍼 컴포넌트 추가:

```tsx
function FrontmatterBadges({
  frontmatter,
}: { frontmatter: AgentFile["frontmatter"] }) {
  if (!frontmatter) return null

  const entries: { label: string; value: string }[] = []
  if (frontmatter.model) entries.push({ label: "model", value: String(frontmatter.model) })
  if (frontmatter.context) entries.push({ label: "context", value: String(frontmatter.context) })
  if (frontmatter.agent) entries.push({ label: "agent", value: String(frontmatter.agent) })
  if (frontmatter["allowed-tools"]) entries.push({ label: "allowed-tools", value: String(frontmatter["allowed-tools"]) })
  if (frontmatter["argument-hint"]) entries.push({ label: "argument-hint", value: String(frontmatter["argument-hint"]) })
  if (frontmatter["disable-model-invocation"]) entries.push({ label: "disable-model-invocation", value: "true" })
  if (frontmatter["user-invocable"] === false) entries.push({ label: "user-invocable", value: "false" })

  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{e.label}</span>
          <Badge variant="secondary">{e.value}</Badge>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: import 추가**

- lucide-react: `Eye`, `Code`, `Copy` 추가
- shadcn: `Tabs`, `TabsList`, `TabsTrigger` from `@/components/ui/tabs`
- shadcn: `Badge` from `@/components/ui/badge`
- i18n 키: `skills_preview` (`"Preview"` / `"프리뷰"`), `skills_source` (`"Source"` / `"소스"`), `skills_copied` (`"Copied to clipboard"` / `"클립보드에 복사됨"`)

**Step 5: 검증**

Run: `pnpm typecheck && pnpm lint`

---

### Task 5: import 정리 및 최종 검증

**Files:**
- Modify: `src/components/pages/SkillsPageContent.tsx`

**Step 1: 미사용 import 제거**

Task 2에서 남은 미사용 import 정리:
- `MoreHorizontal`, `Save` from lucide-react (사용처 확인 후)
- `Switch` from ui/switch
- `Select` 관련 (AddSkillDialog에서 미사용 확인)
- `useForm`, `useStore` from tanstack/react-form

**Step 2: 전체 검증**

Run: `pnpm typecheck && pnpm lint && pnpm build`

**Step 3: 커밋**

```bash
git add src/components/pages/SkillsPageContent.tsx messages/en.json messages/ko.json
git commit -m "refactor(skills): redesign detail panel with read-only view and markdown card"
```

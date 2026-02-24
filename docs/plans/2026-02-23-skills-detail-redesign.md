# Skills Detail Panel Redesign — COMPLETED

## Context

Skills 디테일 패널을 레퍼런스 앱 스타일로 리디자인. 기존 인라인 편집 폼을 읽기 전용 뷰로 전환하고, 마크다운 카드에 프리뷰/소스/복사 기능 추가.

## Design

### Layout (top → bottom)

```text
┌──────────────────────────────────────────────┐
│ skill-name                     [편집 ▼] [...] │ Header
├──────────────────────────────────────────────┤
│ 스코프        마지막 업데이트                    │
│ Global       2026년 2월 22일                   │ Meta info
│                                              │
│ 설명 ⓘ                                       │
│ Description text displayed as plain text...  │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ [프리뷰] [소스]                    [복사] │ │ Tabs + Copy
│ │                                          │ │
│ │ 모델         컨텍스트       에이전트        │ │ Frontmatter badges
│ │ [sonnet]    [fork]        [Explore]      │ │
│ │                                          │ │
│ │ ── separator ──                          │ │
│ │                                          │ │
│ │ ## Markdown Body                         │ │ Body preview
│ │ Content rendered here...                 │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Supporting Files (conditional)               │
│  📄 helper.ts  1.2 KB                        │
└──────────────────────────────────────────────┘
```

### 1. Header

- Left: `skill.name` (text-sm font-semibold)
- Right: **편집 드롭다운 버튼 1개** — `<Button variant="outline" size="sm">편집</Button>`
  - 드롭다운 내용: VS Code / Cursor / Open Folder / separator / Delete
  - 기존 `...` ghost 버튼 제거, 편집 outline 버튼으로 대체

### 2. Meta Info

- `dl` grid 2-col: **스코프** (Global/Project) | **마지막 업데이트** (file mtime via formatDate, 없으면 생략)
- Below: **설명** — description as plain read-only text

### 3. Markdown Card

- Card with `rounded-lg border bg-muted/30`
- **shadcn Tabs** for 프리뷰/소스 toggle
  - 프리뷰 tab (default): Rendered markdown
  - 소스 tab: Raw .md text (frontmatter 포함) in `<pre>` monospace
- **복사 button**: Separate icon button next to tabs, copies full raw content to clipboard
- **프리뷰 mode internals**:
  - Non-empty frontmatter properties shown as inline badges (description 제외, 비어있는 필드 생략)
  - Separator
  - Markdown body via existing `MarkdownPreview` component

### 4. Supporting Files

- Unchanged from current implementation

### 5. Removed

- Frontmatter edit form (dl grid with inputs/selects/switches)
- Save button
- TanStack Form code (`useForm`, `skillFrontmatterSchema`, `initFormValues`)

### 6. New Dependencies

- `useState` for `viewMode: "preview" | "source"`
- shadcn `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`
- `navigator.clipboard.writeText()` for copy
- `Badge` component for frontmatter properties

## Verification

1. `pnpm typecheck` — pass
2. `pnpm lint` — pass
3. `pnpm build` — pass

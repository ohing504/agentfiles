# Dashboard Design System

대시보드 패널 코드 작업 시 반드시 이 문서를 먼저 읽어야 한다.
AI가 실수를 반복하지 않도록 규칙과 금지사항을 명확하게 정의한다.

---

## 레이아웃 구조

Notion 보드 스타일 레이아웃: **스코프 행(User/Project)이 전체 너비**를 차지하고, 각 행 안에 **엔티티 컬럼(카드)**이 수평 배치된다.

```text
BoardLayout
  ├── Sticky Column Headers     ← 상단 고정 헤더 (아이콘 + 타이틀)
  └── Scope Row (Collapsible)   ← User / Project 행 (전체 너비, 접기 가능)
        └── Column Card         ← 엔티티별 카드 (border rounded-lg)
              └── Panel         ← 패널 컴포넌트 (scopeFilter로 필터링)
                    └── ListItem / Empty  ← 아이템 또는 빈 상태
```

파일 위치:
- `src/features/dashboard/components/BoardLayout.tsx` — 보드 레이아웃 + Sheet 상세 드로어
- `src/features/dashboard/components/DetailPanelContent.tsx` — 상세 패널 콘텐츠
- `src/features/dashboard/components/ProjectOverviewGrid.tsx` — BoardLayout 재export
- `src/components/ui/list-item.tsx` — ListItem, ListSubItem
- `src/components/ui/empty.tsx` — Empty 상태 컴포넌트

---

## 패널 컴포넌트 규칙

### scopeFilter prop

모든 패널은 `scopeFilter?: string` prop을 받아 해당 스코프의 아이템만 렌더링한다.
스코프 그룹핑은 패널이 아닌 **BoardLayout**이 담당한다.

```tsx
interface XxxPanelProps {
  scopeFilter?: string
  onSelectItem?: (target: DashboardDetailTarget) => void
  onAction?: (id: EntityActionId, target: NonNullable<DashboardDetailTarget>) => void
}
```

### 빈 상태

아이템이 없을 때 shadcn `Empty` 컴포넌트를 사용한다. i18n 메시지 키는 `board_no_*` 패턴.

```tsx
if (filtered.length === 0)
  return (
    <Empty className="py-6">
      <EmptyMedia variant="icon">
        <ENTITY_ICONS.xxx />
      </EmptyMedia>
      <EmptyDescription>{m.board_no_xxx()}</EmptyDescription>
    </Empty>
  )
```

---

## 사이즈 시스템

**대시보드 패널의 모든 행은 `size="xs"`를 사용한다. 예외 없음.**

```text
패딩:    px-2.5 py-2
갭:      gap-2  (icon ↔ text)
아이콘:  size-4 = 16px  ([&_svg]:size-4 전역 적용)
텍스트:  font-normal leading-tight
```

`ListItem`과 `ListSubItem`이 내부적으로 이미 `size="xs"`를 적용한다.
직접 패딩/폰트/아이콘 크기를 지정하지 말 것.

---

## Collapsible 규칙

### ✅ 올바른 방법: ListItem의 `open` + `children` props

```tsx
<ListItem
  icon={ENTITY_ICONS.plugin}
  label="oh-my-claudecode"
  open={expanded}
  onClick={onToggle}
>
  <CategoryLabel icon={ENTITY_ICONS.skill} label="Skills" count={3} />
  <ListSubItem icon={ENTITY_ICONS.skill} label="commit" onClick={...} />
  <ListSubItem icon={ENTITY_ICONS.skill} label="review" onClick={...} />
</ListItem>
```

### ❌ 절대 하지 말 것: 수동 Collapsible + 커스텀 컴포넌트

```tsx
// ❌ 금지 — 이런 패턴은 사용하지 않는다
<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger asChild>
    <Item size="xs">
      <ItemActions>
        <ChevronRightIcon />  {/* ❌ chevron 절대 금지 */}
      </ItemActions>
    </Item>
  </CollapsibleTrigger>
</Collapsible>
```

> **예외**: BoardLayout의 스코프 행은 `Collapsible`을 직접 사용한다 (행 단위 접기).

---

## CategoryLabel 패턴

`ListItem` 하위 `<ul>` 안에서 카테고리를 구분할 때 사용.
`<li>`로 렌더링되어야 하므로 별도 컴포넌트로 분리한다.
**collapsible 아님, chevron 없음, 클릭 불가.**

현재 `PluginsPanel.tsx`에 정의되어 있다. 다른 패널에도 필요하면 `list-item.tsx`로 이동.

---

## 새 패널 추가 — 표준 패턴

```tsx
export function XxxPanel({ scopeFilter, onSelectItem, onAction }: XxxPanelProps) {
  const { data: items = [] } = useXxxQuery()
  const filtered = scopeFilter ? items.filter((i) => i.scope === scopeFilter) : items

  if (filtered.length === 0)
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon"><ENTITY_ICONS.xxx /></EmptyMedia>
        <EmptyDescription>{m.board_no_xxx()}</EmptyDescription>
      </Empty>
    )

  return (
    <div>
      {filtered.map((item) => (
        <ListItem
          key={item.id}
          icon={ENTITY_ICONS.xxx}
          label={item.name}
          onClick={() => onSelectItem?.({ type: "xxx", item })}
        />
      ))}
    </div>
  )
}
```

---

## 아이콘 규칙

```text
기본 상태:        text-muted-foreground
비활성(disabled): text-muted-foreground/50
MCP connected:    text-emerald-500
MCP auth 필요:    text-amber-500
MCP 실패:         text-red-500
MCP disabled:     text-muted-foreground/40
```

엔티티 아이콘은 반드시 `ENTITY_ICONS`에서 가져온다:
```tsx
import { ENTITY_ICONS } from "@/lib/entity-icons"
// lucide-react에서 직접 import 하지 말 것 — 사이드바와 불일치 발생
```

---

## 금지 사항

| 금지 항목 | 이유 |
|---|---|
| `<ChevronRightIcon>` in panel rows | 다른 패널과 불일치, ListItem에 chevron 없음 |
| `Item size="sm"` or `size="default"` | 패널 행은 항상 `size="xs"` |
| `text-[11px]`, `size-3` (비표준 크기) | 일관성 깨짐 |
| 직접 `Collapsible` 컴포넌트 사용 (패널 내부) | ListItem의 `open`+`children` 패턴 사용 |
| lucide-react 아이콘 직접 import | `ENTITY_ICONS` 사용 |
| 패널 내부에서 스코프 그룹핑 | `scopeFilter` prop으로 BoardLayout이 담당 |
| 하드코딩된 빈 상태 문자열 | i18n `m.board_no_*()` 사용 |

---

## 새 타입 추가 시 업데이트 대상

1. `src/features/dashboard/types.ts` — `DashboardDetailTarget` 타입
2. `src/features/dashboard/components/BoardLayout.tsx` — columnDefs + renderPanel
3. `src/features/dashboard/components/DetailPanelContent.tsx` — 상세 뷰 렌더링
4. `messages/en/common.json` + `messages/ko/common.json` — `board_no_*` 메시지

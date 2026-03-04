# Dashboard Design System

대시보드 패널 코드 작업 시 반드시 이 문서를 먼저 읽어야 한다.
AI가 실수를 반복하지 않도록 규칙과 금지사항을 명확하게 정의한다.

---

## 컴포넌트 계층 구조

```text
OverviewPanel                ← 패널 외부 컨테이너 (제목, 카운트, 액션)
  └── ScopeGroup             ← scope 섹션 헤더 (User / Project / Local)
        └── ListItem         ← 클릭 가능한 기본 행 (collapsible 지원)
              ├── CategoryLabel   ← ListItem 하위 카테고리 레이블 (정적, chevron 없음)
              └── ListSubItem     ← ListItem 하위 개별 항목
```

파일 위치:
- `src/components/ui/item.tsx` — Item 기반 컴포넌트 (size/variant 시스템)
- `src/components/ui/list-item.tsx` — ListItem, ListSubItem
- `src/features/dashboard/components/OverviewPanel.tsx`
- `src/features/dashboard/components/ScopeGroup.tsx`
- `src/features/dashboard/components/PluginsPanel.tsx` — CategoryLabel 정의

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

내부 구조 (ListItem이 자동 생성):
```tsx
<Collapsible open={open}>
  <CollapsibleTrigger asChild>{/* 전체 row가 trigger */}</CollapsibleTrigger>
  <CollapsibleContent>
    <ul className="ml-3.5 pl-2.5 py-0.5 flex flex-col gap-0.5">
      {children}  {/* CategoryLabel (<li>) + ListSubItem (<li>) */}
    </ul>
  </CollapsibleContent>
</Collapsible>
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

---

## Chevron(꺾인 화살표) 규칙

**대시보드 패널에서 chevron 아이콘은 절대 표시하지 않는다.**

- `ListItem` collapsible: chevron 없음 (전체 row 클릭으로 토글)
- `CategoryLabel`: chevron 없음 (정적 레이블)
- `ScopeGroup`: chevron 없음 (정적 헤더)
- 예외 없음

다른 패널과 비교해서 특정 패널만 chevron이 있으면 그것이 버그다.

---

## CategoryLabel 패턴

`ListItem` 하위 `<ul>` 안에서 카테고리를 구분할 때 사용.
`<li>`로 렌더링되어야 하므로 별도 컴포넌트로 분리한다.
**collapsible 아님, chevron 없음, 클릭 불가.**

```tsx
function CategoryLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: ElementType
  label: string
  count: number
}) {
  return (
    <li className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5 first:pt-0.5">
      <Icon className="size-3 shrink-0" />
      {label}
      <span className="font-normal">({count})</span>
    </li>
  )
}
```

현재 `PluginsPanel.tsx`에 정의되어 있다. 다른 패널에도 필요하면 `list-item.tsx`로 이동.

---

## 새 패널 추가 — 표준 패턴

```tsx
export function XxxPanel({ onSelectItem }: { onSelectItem?: (t: DashboardDetailTarget) => void }) {
  const { data: items = [] } = useXxxQuery()
  const groups = groupByScope(items)

  return (
    <OverviewPanel title="XXX" count={items.length}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-2">No XXX</p>
      ) : (
        <div>
          {groups.map(({ scope, items }) => (
            <ScopeGroup key={scope} scope={scope}>
              {items.map((item) => (
                <ListItem
                  key={item.id}
                  icon={ENTITY_ICONS.xxx}
                  label={item.name}
                  onClick={() => onSelectItem?.({ type: "xxx", item })}
                />
              ))}
            </ScopeGroup>
          ))}
        </div>
      )}
    </OverviewPanel>
  )
}
```

하위 항목이 있는 경우 (PluginsPanel처럼):

```tsx
<ListItem icon={ENTITY_ICONS.plugin} label={plugin.name} open={expanded} onClick={onToggle}>
  {/* 카테고리가 여러 개면 CategoryLabel로 구분 */}
  <CategoryLabel icon={ENTITY_ICONS.skill} label="Skills" count={skills.length} />
  {skills.map(s => <ListSubItem key={s.name} icon={ENTITY_ICONS.skill} label={s.name} onClick={...} />)}

  <CategoryLabel icon={ENTITY_ICONS.mcp} label="MCP Servers" count={mcpServers.length} />
  {mcpServers.map(s => <ListSubItem key={s.name} icon={ENTITY_ICONS.mcp} label={s.name} onClick={...} />)}
</ListItem>
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

MCP 상태 색상:
```tsx
import { getMcpIconClass } from "@/lib/mcp-status"
<ListSubItem iconClassName={getMcpIconClass(server, statusMap)} ... />
```

---

## 금지 사항

| 금지 항목 | 이유 |
|---|---|
| `<ChevronRightIcon>` in panel rows | 다른 패널과 불일치, ListItem에 chevron 없음 |
| `Item size="sm"` or `size="default"` | 패널 행은 항상 `size="xs"` |
| `text-[11px]`, `size-3` (비표준 크기) | 일관성 깨짐 |
| 직접 `Collapsible` 컴포넌트 사용 | ListItem의 `open`+`children` 패턴 사용 |
| `SubGroup` 패턴 (삭제됨) | `CategoryLabel` + flat `ListSubItem` 패턴으로 교체됨 |
| lucide-react 아이콘 직접 import | `ENTITY_ICONS` 사용 |

---

## 새 타입 추가 시 업데이트 대상

1. `src/features/dashboard/types.ts` — `DashboardDetailTarget` 타입
2. `src/features/dashboard/components/ProjectOverviewGrid.tsx` — 패널 배치 및 `DetailPanelContent`
3. `src/features/dashboard/components/DashboardDetailSheet.tsx` — Sheet 상세 뷰 (좁은 화면)

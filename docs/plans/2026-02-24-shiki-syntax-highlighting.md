# Shiki 구문 하이라이팅 통합 — COMPLETED

## Context

마크다운 프리뷰(`react-markdown`)와 코드 뷰(`ShikiCodeBlock`)가 서로 다른 렌더링 파이프라인을 사용하여 시각적 불일치 발생. 듀얼 테마(라이트/다크)를 적용하고, 마크다운 내 코드 블록에도 구문 하이라이팅을 통합.

## 변경 파일 요약

| 파일 | 액션 | 변경 |
|---|---|---|
| `src/lib/shiki-config.ts` | **신규** | 공통 듀얼 테마 설정 (`github-light-default` + `github-dark-default`) |
| `src/styles.css` | 수정 | Shiki 다크모드 CSS 변수 전환 + 라인넘버 CSS counter |
| `src/components/ui/shiki-code-block.tsx` | 수정 | 듀얼 테마, `embedded`/`lineNumbers` props, transformer 기반 |
| `src/components/ui/markdown-preview.tsx` | 수정 | `components` prop으로 코드 블록 → ShikiCodeBlock 연결, `pre` passthrough |
| `src/components/FileViewer.tsx` | 수정 | 통합 카드 구조, `CodeXml` 아이콘, 고정 높이 헤더 |
| `src/components/ui/tree.tsx` | 수정 | `hideChevron` 모드에서 chevron/label 클릭 분리 |
| `src/components/pages/SkillsPageContent.tsx` | 수정 | 파일 전환 버그 수정, FrontmatterBadges flex-wrap, 콤마 split |

## 핵심 설계 결정

### 1. 듀얼 테마 (`shiki-config.ts`)

Shiki의 `themes` 옵션으로 light/dark 테마를 동시 지정. 각 토큰에 CSS 변수(`--shiki-light`, `--shiki-dark`)가 생성되고, `.dark` 클래스로 전환:

```css
.dark .shiki,
.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
```

### 2. react-markdown 통합 (rehypeShiki 미사용)

`@shikijs/rehype`는 `react-markdown`의 동기식 파이프라인(`runSync`)과 비호환. 대신 `components` prop으로 코드 블록을 `ShikiCodeBlock`에 위임:

```tsx
components={{
  pre({ children }) { return <>{children}</> },  // 바깥 pre 제거 (이중 카드 방지)
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className || "")
    if (match) return <ShikiCodeBlock code={...} lang={match[1]} />
    return <code>{children}</code>
  },
}}
```

### 3. ShikiCodeBlock props

- `embedded`: 카드 내부 사용 시 pre의 bg/rounded/padding 제거
- `lineNumbers`: 코드/스크립트 파일에만 적용, 마크다운 뷰에서는 비활성
- fallback 제거: Shiki 처리 전 `null` 반환 (깜빡임 방지)

### 4. FileViewer 통합 구조

마크다운/비마크다운 분기를 하나의 카드로 통합:
- 고정 높이 헤더 (`h-11`) — Tabs 유무와 관계없이 카피 버튼 위치 일관
- 마크다운: 프리뷰/소스 탭 + 카피 버튼
- 비마크다운: 카피 버튼만

### 5. TreeFolder chevron/label 분리

`hideChevron` 모드에서:
- 라벨 클릭 → `onClick`만 호출 (항상 확장)
- chevron 클릭 → collapse 토글만

### 6. FrontmatterBadges

- `flex-wrap`으로 가로 나열, 라벨 위/값 아래 유지
- 콤마 구분 값 (예: `allowed-tools`) 개별 Badge로 split

## 검증

- `pnpm typecheck` — 통과
- `pnpm lint` — 통과
- `pnpm build` — 통과

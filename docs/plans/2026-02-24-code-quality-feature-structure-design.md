# Code Quality: Feature-Based Structure for Hooks & Skills

> **Scope**: hooks-editor, skills-editor, routes directory migration. Other pages (plugins, mcp, files, settings) are deferred.

---

## Background

Skills와 Hooks 페이지 구현이 완료되었으나 단일 파일 크기가 과도함:
- HooksPageContent.tsx: 1,334줄
- SkillsPageContent.tsx: 937줄

앞으로 plugins, mcp, settings 등을 같은 패턴으로 리팩토링할 예정이므로, 먼저 공통 기반(폴더 구조, 공유 위젯)을 정리한다.

## Decisions

| 항목 | 결정 |
|------|------|
| 폴더 구조 | **Hybrid** — components/ 내부는 feature 기반, server/services/hooks는 기술 레이어 유지 |
| 콜로케이션 범위 | **전체** — UI + Server Functions + React Query 훅 모두 feature 폴더에 |
| 공유 컴포넌트 위치 | **components/ 루트** — feature-based에서 components/ 자체가 공유 레이어이므로 shared/ 하위 폴더 불필요 |
| 추출 범위 | **폴더 정리 + 핵심 공통 위젯 1-2개** |
| 작업 순서 | **폴더 먼저 → 위젯 추출 → 라우트 정리** |
| 접근법 | **페이지 단위 점진적 이동** (커밋당 변경 범위 작게) |
| 라우트 구조 | **Directory routes** — flat routes 대신 디렉토리 기반 라우팅 |

## Research Basis

- **TanStack Query maintainer** (Discussion #3017): 도메인별 그룹핑 > 타입별 수평 그룹핑
- **Bulletproof React**: features/X/api/ + components/ + hooks/ + types/ 패턴
- **TanStack Start 파일 접미사**: `.functions.ts` (server fns), `.server.ts` (server-only), `.queries.ts` (query options)
- **콜로케이션 원칙** (Kent C. Dodds): 2곳 이상에서 사용 시에만 공유 폴더로 승격
- **Screaming Architecture**: 폴더명이 기술이 아닌 비즈니스 도메인을 표현
- **TanStack Router directory routes**: `route.tsx` (layout/leaf), `index.tsx` (index page), `$param/` (dynamic segment directory)

## Target Folder Structure

```text
src/
  components/
    layout/                            ← NEW
      Layout.tsx
      Sidebar.tsx
      StatusBar.tsx
    features/                          ← NEW
      hooks-editor/
        components/
          HooksPageContent.tsx         ← ~300줄 (축소)
          HookDetailPanel.tsx          ← 추출
          HooksScopeSection.tsx        ← 추출
          AddHookDialog.tsx            ← 추출
        api/
          hooks.functions.ts           ← server/hooks.ts에서 이동
          hooks.queries.ts             ← use-config.ts에서 useHooks() 추출
        constants.ts                   ← HOOK_EVENT_META, HOOK_TEMPLATES
      skills-editor/
        components/
          SkillsPageContent.tsx        ← ~200줄 (축소)
          SkillDetailPanel.tsx         ← 추출
          SkillsScopeSection.tsx       ← 추출
          AddSkillDialog.tsx           ← 추출
          SupportingFilePanel.tsx      ← 추출
        api/
          skills.functions.ts          ← server/skills.ts에서 이동
        constants.ts
    pages/                             ← 기존 유지 (나중에 리팩토링)
    settings/                          ← 기존 유지
    ui/                                ← shadcn 변경 없음
    icons/                             ← 기존 유지
    FileViewer.tsx                     ← 기존 위치 유지 (공유)
    ScopeBadge.tsx                     ← 기존 위치 유지 (공유)
    ErrorBoundary.tsx                  ← 기존 위치 유지 (공유)
    ProjectContext.tsx                 ← 기존 위치 유지 (공유)
    ProjectSwitcher.tsx                ← 기존 위치 유지 (공유)
    AddProjectDialog.tsx               ← 기존 위치 유지 (공유)
    LanguageSwitcher.tsx               ← 기존 위치 유지 (공유)
    DetailField.tsx                    ← NEW: 공통 위젯 추출

  routes/                              ← directory routes로 전환
    __root.tsx                         ← 유지
    index.tsx                          ← 유지
    hooks/route.tsx                    ← hooks.tsx에서 이동
    skills/route.tsx                   ← skills.tsx에서 이동
    files/route.tsx                    ← files.tsx에서 이동 (redirect)
    plugins/
      index.tsx                        ← plugins.tsx에서 이동 (redirect)
      $id/route.tsx                    ← plugins.$id.tsx에서 이동 (redirect)
    mcp/
      index.tsx                        ← mcp.tsx에서 이동 (redirect)
      $name/route.tsx                  ← mcp.$name.tsx에서 이동 (redirect)
    global/
      route.tsx                        ← global.tsx에서 이동 (layout)
      settings/route.tsx
      files/route.tsx
      plugins/
        index.tsx
        $id/route.tsx
      mcp/
        index.tsx
        $name/route.tsx
    project/
      route.tsx                        ← project.tsx에서 이동 (layout)
      settings/route.tsx
      files/route.tsx
      plugins/
        index.tsx
        $id/route.tsx
      mcp/
        index.tsx
        $name/route.tsx
    api/health.ts                      ← 유지

  services/                            ← 변경 없음
  hooks/use-config.ts                  ← 축소 (공유 훅만 유지)
  server/                              ← 축소 (공유 서버함수만 유지)
  lib/                                 ← 변경 없음
  shared/                              ← 변경 없음
```

### What Stays

- `src/services/` — ConfigService, HooksService 등 비즈니스 로직
- `src/server/config.ts`, `server/validation.ts` — 인프라 서버 함수
- `src/lib/` — utils, auth, query-keys, format
- `src/shared/types.ts` — 공유 타입
- `src/components/pages/` — plugins, mcp, files (나중에 리팩토링)
- `src/components/settings/` — 설정 페이지
- `src/components/ui/` — shadcn 원본
- `src/components/*.tsx` — 공유 컴포넌트 (루트에 유지)

## Routes: Flat → Directory Migration

### Naming Convention

| 파일명 | 역할 |
|--------|------|
| `route.tsx` | 레이아웃 또는 단독 leaf 페이지 |
| `index.tsx` | 디렉토리의 index 페이지 (sibling param 라우트가 있을 때) |
| `$param/route.tsx` | 동적 파라미터 라우트 |

### Key Decision: `route.tsx` vs `index.tsx`

- **Leaf page** (hooks, skills, settings, files): `route.tsx` — 자식 라우트 없음
- **List+Detail** (plugins, mcp): `index.tsx` + `$param/route.tsx` — `route.tsx`는 layout parent가 되어 beforeLoad redirect가 자식까지 intercept하는 문제 방지
- **Layout** (global, project): `route.tsx` — `<Outlet />` 렌더링

## Component Decomposition

### HooksPageContent (1,334줄 → 5개 파일)

| File | Lines | Responsibility |
|------|-------|----------------|
| `HooksPageContent.tsx` | ~300 | 상태 관리 + 3패널 레이아웃 조합 |
| `HookDetailPanel.tsx` | ~200 | 메타 그리드 + 스크립트/프롬프트 미리보기 |
| `HooksScopeSection.tsx` | ~150 | 스코프별 이벤트 트리 + 검색 필터링 |
| `AddHookDialog.tsx` | ~450 | 생성/편집 공용 폼 (2열 그리드, 템플릿) |
| `constants.ts` | ~150 | HOOK_EVENT_META, HOOK_TEMPLATES |

### SkillsPageContent (937줄 → 6개 파일)

| File | Lines | Responsibility |
|------|-------|----------------|
| `SkillsPageContent.tsx` | ~200 | 상태 관리 + 레이아웃 조합 |
| `SkillDetailPanel.tsx` | ~200 | 메타 정보 + FileViewer + 드롭다운 메뉴 |
| `SkillsScopeSection.tsx` | ~150 | 스코프별 skill/command 트리 |
| `AddSkillDialog.tsx` | ~100 | 생성 폼 (TanStack Form + Zod) |
| `SupportingFilePanel.tsx` | ~150 | 스킬 폴더 내 추가 파일 표시 |
| `constants.ts` | ~80 | FrontmatterBadges 등 |

## Shared Widget Extraction

### DetailField

현재 HooksPageContent 내 인라인 정의. Skills에서도 유사 패턴 사용.

```tsx
// components/DetailField.tsx
interface DetailFieldProps {
  label: string
  children: React.ReactNode
}

function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}
```

## Implementation Steps

| Step | Content | Commit | Validation |
|------|---------|--------|------------|
| 1 | `layout/` 폴더 생성 + Layout/Sidebar/StatusBar 이동 | `refactor(components): move layout components to layout/` | typecheck + build |
| 2 | `features/hooks-editor/components/` — 서브컴포넌트 분리 | `refactor(hooks): decompose HooksPageContent into sub-components` | typecheck + build |
| 3 | `features/hooks-editor/api/` — server/hooks.ts 이동 + useHooks() 추출 | `refactor(hooks): colocate server functions and query hooks` | typecheck + build + test |
| 4 | `features/skills-editor/` — 서브컴포넌트 분리 + api 콜로케이션 | `refactor(skills): decompose and colocate skills-editor feature` | typecheck + build + test |
| 5 | `DetailField` 공유 위젯 추출 | `refactor(shared): extract DetailField common widget` | typecheck + build |
| 6 | routes flat → directory 전환 | `refactor(routes): migrate from flat to directory-based routing` | typecheck + build |

## Rules

- **콜로케이션**: feature 전용 코드 → feature 폴더. 2곳 이상 공유 시 → `components/` 루트
- **기존 페이지 미변경**: plugins, mcp, files, settings는 현재 위치 유지
- **services/ 미변경**: 비즈니스 로직은 기술 레이어에 유지
- **각 단계마다 검증**: `pnpm typecheck && pnpm lint && pnpm build`
- **TanStack Router 관례 준수**: directory routes (`route.tsx`, `index.tsx`), auto-gen route tree

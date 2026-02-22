# Unified Files View Design

> Date: 2026-02-22
> Status: Approved

## Problem

현재 아키텍처가 파일 타입별로 과잉 분리되어 있음:
- Agents, Commands, Skills, CLAUDE.md가 각각 별도 사이드바 메뉴 + 라우트 + 컴포넌트
- 3개 목록 페이지(agents.tsx, commands.tsx, skills.tsx)가 아이콘과 타입 문자열만 다른 사실상 복붙
- 3개 상세 페이지도 AgentFileDetail.tsx로 추출되어 있지만 여전히 별도 라우트
- 본질적으로 모든 항목이 `.claude/` 디렉토리의 마크다운/JSON 파일

## Solution

사이드바 7개 메뉴 → 4개로 축소. CLAUDE.md + Agents + Commands + Skills를 하나의 "Files" 페이지로 통합.

### 사이드바 변경

| Before | After |
|--------|-------|
| Dashboard | Dashboard |
| CLAUDE.md | **Files** |
| Agents | *(삭제)* |
| Commands | *(삭제)* |
| Skills | *(삭제)* |
| Plugins | Plugins |
| MCP Servers | MCP Servers |

### Files 페이지 레이아웃

현재 CLAUDE.md 에디터의 좌측 트리 + 우측 에디터 패턴을 확장:

```
┌─────────────────────────────────────────────────────┐
│  📂 Tree (300px)        │  Editor                   │
│  ──────────────────     │  ───────────────────────── │
│  🌐 Global              │  📄 ~/.claude/agents/foo.md│
│    ├─ CLAUDE.md         │  1.2KB · 2h ago            │
│    ├─ agents/           │                            │
│    │  ├─ foo.md  ←선택   │  ┌──────────────────────┐  │
│    │  └─ bar.md         │  │ (textarea)            │  │
│    ├─ commands/         │  │ frontmatter + content │  │
│    │  └─ baz.md         │  └──────────────────────┘  │
│    └─ skills/           │                            │
│       └─ qux.md         │  [Unsaved] [💾 Save]       │
│                         │                            │
│  📂 my-project          │                            │
│    ├─ CLAUDE.md         │                            │
│    ├─ .claude/CLAUDE.md │                            │
│    ├─ agents/           │                            │
│    └─ commands/         │                            │
└─────────────────────────────────────────────────────┘
```

### Scope 표시

- Global과 Project 섹션을 Collapsible로 동시 표시 (현재 CLAUDE.md 에디터와 동일)
- 각 파일 옆에 ScopeBadge 불필요 (트리 구조에서 이미 scope가 명확)

### 에디터

- 현재 ClaudeMdEditor의 textarea + save 패턴을 일반화
- 파일 메타정보(path, size, lastModified) 표시
- frontmatter는 파일 내용의 일부이므로 textarea에서 직접 편집
- 저장 성공 피드백 ("Saved" 텍스트, 기존 구현 재사용)

### 데이터 흐름

```
트리 구성:
  useAgentFiles("agent") + useAgentFiles("command") + useAgentFiles("skill")
  + useClaudeMdFiles() + useClaudeMdGlobalMeta()
  → 트리 노드로 변환

파일 읽기:
  CLAUDE.md → readClaudeMdFileFn (기존)
  agent/command/skill → getItemFn (기존, content 포함)

파일 쓰기:
  CLAUDE.md → saveClaudeMdFileFn (기존)
  agent/command/skill → saveItemFn (기존)
```

### 삭제할 파일

- `src/routes/claude-md.tsx`
- `src/routes/agents.tsx`, `src/routes/agents.$name.tsx`
- `src/routes/commands.tsx`, `src/routes/commands.$name.tsx`
- `src/routes/skills.tsx`, `src/routes/skills.$name.tsx`

### 새로 만들 파일

- `src/routes/files.tsx` — 통합 Files 페이지

### 수정할 파일

- `src/components/Sidebar.tsx` — 메뉴 항목 변경 (7개 → 4개)
- `src/components/AgentFileDetail.tsx` — 삭제 (Files 페이지에 흡수)
- `src/routes/index.tsx` — Dashboard StatCard 링크 업데이트

### 변경하지 않는 것

- Plugins 페이지 — JSON config + CLI enable/disable
- MCP 페이지 — JSON config + CLI add/remove
- Dashboard — 유지 (서버 함수 동일)
- 모든 서버 함수 — 변경 없음

## 함께 처리할 개선사항

분석 문서에서 남은 항목 중 이번 작업에 포함:

| # | 항목 | 처리 방법 |
|---|------|-----------|
| BP-5 | AddMcpDialog 폼 상태 통합 | 단일 객체 + onOpenChange 리셋 |
| UI-4 | MCP select → shadcn Select | 기본 `<select>` 교체 |
| UI-5 | 빈 상태 CTA | Files 빈 상태에 경로 안내 |
| UI-7 | Dashboard StatCard i18n | 하드코딩 문자열 → m.scope_*() |
| UI-8 | Plugin 카드 클릭 영역 분리 | 카드 전체 Link → 제목만 Link |
| BP-8 | LanguageSwitcher 접근성 | aria-pressed 추가 |

## 분석 문서 업데이트

작업 완료 후 3개 분석 문서의 완료 상태 업데이트:
- `docs/react-best-practices-analysis.md`
- `docs/react-hooks-analysis.md`
- `docs/ui-ux-analysis.md`

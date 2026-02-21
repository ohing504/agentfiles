# Multi-Project Support Design

> agentfiles에 여러 프로젝트를 등록하고 전환할 수 있는 기능 추가

Date: 2026-02-21

---

## Problem

현재 agentfiles는 서버 시작 시 `process.cwd()`에 고정되어 하나의 프로젝트만 보여준다. 사용자는 여러 프로젝트의 에이전트 설정을 한 곳에서 관리하고 싶어한다. VS Code나 Cursor처럼 프로젝트를 전환하며 각각의 설정을 확인/편집할 수 있어야 한다.

## Approach

**프론트엔드 전환 방식** — 서버는 stateless를 유지하고, 프론트엔드에서 선택된 프로젝트 경로를 server function 파라미터로 전달한다.

---

## 1. Data Model

### `~/.claude/agentfiles.json`

```json
{
  "projects": [
    {
      "path": "/Users/ohing/workspace/agentfiles",
      "name": "agentfiles",
      "addedAt": "2026-02-21T10:00:00Z"
    },
    {
      "path": "/Users/ohing/workspace/my-saas",
      "name": "my-saas",
      "addedAt": "2026-02-21T11:00:00Z"
    }
  ],
  "activeProject": "/Users/ohing/workspace/agentfiles"
}
```

- `name`: 폴더명에서 자동 추출 (사용자 편집 가능)
- `activeProject`: 마지막 선택 프로젝트 경로 (앱 재시작 시 복원). `null`이면 Global Only 모드

### `Project` type (`shared/types.ts`)

```typescript
export interface Project {
  path: string
  name: string
  addedAt: string // ISO 8601
  hasClaudeDir?: boolean
}
```

---

## 2. Server-Side Changes

### config-service.ts

`getProjectConfigPath()`를 파라미터 기반으로 변경:

```typescript
// Before
export function getProjectConfigPath(): string {
  return path.join(process.cwd(), ".claude")
}

// After
export function getProjectConfigPath(projectPath?: string): string {
  if (!projectPath) return path.join(process.cwd(), ".claude")
  return path.join(projectPath, ".claude")
}
```

모든 데이터 조회 함수에 `projectPath` 파라미터 추가:
- `getOverview(projectPath?)`
- `getMcpServers(projectPath?)`
- `getAgentFiles(type, projectPath?)`
- `getClaudeMd(scope, projectPath?)`

기존 동작(projectPath 없으면 cwd 사용) 하위 호환 유지.

### New server functions (`server/projects.ts`)

```
getProjectsFn()              → agentfiles.json에서 프로젝트 목록 읽기
addProjectFn(path)           → 프로젝트 추가 (경로 유효성 검증)
removeProjectFn(path)        → 프로젝트 제거
setActiveProjectFn(path)     → 활성 프로젝트 변경
scanClaudeMdFiles(projectPath) → 재귀적으로 CLAUDE.md 파일들 탐색
```

### CLAUDE.md recursive scan

프로젝트 루트부터 재귀적으로 CLAUDE.md 탐색:
- 제외 디렉토리: `node_modules/`, `.git/`, `dist/`, `.output/`, `build/`
- 최대 탐색 깊이: 5단계
- 상대 경로로 표시

### Security

- `addProjectFn`: `path.resolve()`로 정규화, 실제 존재하는 디렉토리인지 검증
- 기존 `validation.ts`의 path traversal 방지 패턴 따름

---

## 3. Frontend Architecture

### ProjectContext (React Context)

```typescript
interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null  // null = Global Only
  setActiveProject: (path: string | null) => void
  addProject: (path: string) => void
  removeProject: (path: string) => void
}
```

- 모든 React Query 훅에 `activeProject?.path`를 서버 함수 파라미터로 전달
- 프로젝트 전환 시 React Query key 변경 → 자동 refetch

### ProjectSwitcher component (SidebarHeader)

현재 로고 자리를 프로젝트 스위처로 대체. shadcn DropdownMenu 패턴 사용:

```
┌─────────────────────┐
│ 📁 agentfiles    ▼  │  ← 클릭하면 드롭다운
├─────────────────────┤
│ ✓ agentfiles        │  ← 현재 선택됨
│   my-saas           │
│ ──────────────────  │
│   🌐 Global Only    │
│ ──────────────────  │
│   + Add Project     │
│   ⚙ Manage...      │
└─────────────────────┘
```

- 사이드바 collapsed 상태: 폴더 아이콘만 표시, 클릭 시 동일 드롭다운

### AddProjectDialog

두 가지 입력 방식 제공:
1. **텍스트 입력**: 경로 직접 입력
2. **폴더 선택**: `showDirectoryPicker()` (File System Access API)
   - Fallback: 서버 사이드 디렉토리 탐색 UI

서버에서 경로 검증 후 `.claude/` 존재 여부를 배지로 표시. 없어도 등록 가능.

### Scope view

Global(불변) + 선택된 Project 스코프를 함께 표시. 현재와 동일한 구조이나 project가 전환됨.

---

## 4. CLAUDE.md Editor Changes

기존 global/project 2탭 → Collapsible 트리 목록으로 변경:

```
📁 Global
  └─ ~/.claude/CLAUDE.md                    [Edit]

📁 agentfiles (현재 프로젝트)        ▼ 펼침/접힘
  ├─ ./CLAUDE.md                            [Edit]
  ├─ ./.claude/CLAUDE.md                    [Edit]
  └─ ./src/CLAUDE.md                        [Edit]
```

- shadcn Collapsible + 리스트 패턴 활용 (sidebar-11 파일 트리 참조)
- 각 파일 클릭 → 기존 textarea 에디터로 편집

---

## 5. Change Impact Summary

| Area | Change | Impact |
|------|--------|--------|
| `shared/types.ts` | `Project` type 추가 | Low |
| `services/config-service.ts` | 모든 함수에 `projectPath` 파라미터, `scanClaudeMdFiles()` 신규 | Medium |
| `server/*.ts` | 모든 server function에 `projectPath` 전달 | Medium |
| `server/projects.ts` | 신규 — 프로젝트 CRUD | Low |
| `hooks/use-config.ts` | 모든 훅에 `activeProject?.path` query key + 파라미터 | Medium |
| `components/ProjectContext.tsx` | 신규 | Low |
| `components/ProjectSwitcher.tsx` | 신규 — 사이드바 헤더 드롭다운 | Low |
| `components/AddProjectDialog.tsx` | 신규 — 프로젝트 추가 다이얼로그 | Low |
| `components/Sidebar.tsx` | 헤더를 ProjectSwitcher로 교체 | Low |
| `routes/claude-md.tsx` | 2탭 → Collapsible 트리 + 재귀 CLAUDE.md 목록 | Medium |

### Not changing

- 라우팅 구조 (URL에 프로젝트 인코딩 안 함)
- 인증 방식 (토큰 기반 유지)
- CLI (`bin/cli.ts`)
- 빌드/배포 파이프라인

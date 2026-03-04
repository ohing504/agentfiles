# Memory System — 읽기 전용 대시보드 통합

> 2026-03-05 작성

## 목표

Claude Code의 프로젝트별 메모리 파일(`~/.claude/projects/{slug}/memory/*.md`)을 agentfiles 대시보드에서 조회할 수 있도록 한다. 읽기 전용.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 기능 범위 | 읽기 전용 (목록 + 내용 조회) |
| UI 위치 | 대시보드 그리드 내 패널 (별도 라우트 없음) |
| 스코프 | Project 전용 (프로젝트 선택 시에만 표시) |
| 경로 매핑 | Slug 역변환 (`projectPath → slug`) |

## 메모리 경로 구조

```text
~/.claude/projects/{slug}/memory/
├── MEMORY.md              ← 메인 메모리 (항상 컨텍스트에 로드됨)
├── testing-patterns.md    ← 토픽별 상세 메모리
└── debugging.md
```

- `{slug}`: 프로젝트 절대경로에서 선행 `/` 제거 후 나머지 `/`를 `-`로 치환
- 예: `/Users/ohing/workspace/financial` → `-Users-ohing-workspace-financial`

## 데이터 모델

### MemoryFile 타입

```typescript
interface MemoryFile {
  name: string           // "MEMORY.md"
  path: string           // 절대 경로
  size: number
  lastModified: string   // ISO 8601
  content: string        // 마크다운 원문
}
```

### Overview 확장

```typescript
interface Overview {
  // ... 기존 필드
  memory: { total: number }  // 프로젝트 선택 시에만 값 있음
}
```

### DashboardDetailTarget 확장

```typescript
type DashboardDetailTarget =
  | // ... 기존 타입
  | { type: "memory"; file: MemoryFile }
```

## 서비스 레이어

### memory-service.ts (신규)

```typescript
// 프로젝트 경로 → slug 변환
function projectPathToSlug(projectPath: string): string

// 메모리 디렉토리 경로
function getMemoryDir(projectPath: string): string

// 메모리 파일 목록 + 내용 조회
async function getMemoryFiles(projectPath: string): Promise<MemoryFile[]>

// 단일 파일 내용 조회
async function getMemoryFileContent(
  projectPath: string,
  fileName: string,
): Promise<MemoryFile | null>
```

### server/memory.ts (신규)

- `getMemoryFilesFn` — Server Function으로 `getMemoryFiles` 래핑
- `getMemoryFileContentFn` — Server Function으로 `getMemoryFileContent` 래핑

### use-config.ts (수정)

- `useMemoryFiles(projectPath)` — React Query 훅 추가

## UI

### 대시보드 그리드 배치

```text
┌─────────────┬─────────────┬─────────────┐
│  Plugins    │  MCP        │  Skills     │  ← 상단 (flex-1)
├─────────────┼─────────────┼─────────────┤
│  Hooks      │  Agents     │  LSP        │  ← 하단 (h-160px)
├─────────────┴─────────────┴─────────────┤
│  Memory Files (프로젝트 선택 시에만)       │  ← 신규 (h-160px)
└─────────────────────────────────────────┘
```

### MemoryPanel

- 프로젝트 미선택 시 렌더링하지 않음
- 파일 목록: 이름, 크기, 수정일 표시
- 클릭 시 우측 디테일 패널에 마크다운 내용 렌더링

### MemoryDetailPanel

- 마크다운 원문을 읽기 전용으로 렌더링
- 파일 경로 표시

## 변경 파일

| 파일 | 변경 |
|------|------|
| `src/services/memory-service.ts` | **신규** — slug 변환 + 파일 스캔 |
| `src/server/memory.ts` | **신규** — Server Functions |
| `src/hooks/use-config.ts` | **수정** — useMemoryFiles 훅 |
| `src/services/overview-service.ts` | **수정** — memory 카운트 |
| `src/shared/types.ts` | **수정** — MemoryFile, Overview.memory |
| `src/features/dashboard/types.ts` | **수정** — DashboardDetailTarget 확장 |
| `src/features/dashboard/components/MemoryPanel.tsx` | **신규** — 대시보드 패널 |
| `src/features/dashboard/components/MemoryDetailPanel.tsx` | **신규** — 디테일 뷰 |
| `src/features/dashboard/components/ProjectOverviewGrid.tsx` | **수정** — MemoryPanel 배치 |

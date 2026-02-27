# Files Editor Design

## Goal

기존 Files 페이지를 `.claude/` 디렉토리 전체 파일 탐색기 + 뷰어로 리팩토링한다.
인라인 편집을 제거하고 뷰어 중심으로 전환하며, EDITOR-GUIDE.md 패턴을 따르는 feature 모듈로 구현한다.

## Architecture

- **Feature module**: `src/features/files-editor/` (EDITOR-GUIDE 패턴)
- **서비스**: feature-local `files-scanner.service.ts` (디렉토리 재귀 스캔 + 파일 읽기)
- **Server Functions**: feature-local `files.functions.ts` (트리 조회 + 파일 콘텐츠 읽기)
- **React Query**: feature-local `files.queries.ts` + query keys
- **라우트**: `/files` 단일 라우트 (내부 스코프 탭으로 Global/Project 전환)

## 핵심 결정사항

| 항목 | 결정 |
|---|---|
| 역할 | `.claude/` 디렉토리 전체 파일 탐색기 + 뷰어 |
| 이름 | "Files" (변경 없음) |
| 네비게이션 | top-level로 승격 (Dashboard, Skills 등과 동일 레벨) |
| 편집 | 인라인 편집 없음. 읽기 전용 뷰어 + "Open in Editor" 버튼 |
| 스코프 | 내부 탭으로 Global(`~/.claude/`) / Project(`.claude/`) 전환 |
| 레이아웃 | 좌측 파일 트리(280px) + 우측 뷰어 (기존 에디터 패턴 통일) |
| 제외 대상 | gitignore 패턴: `plugins/cache/`, `*.db`, `*.lock`, `teams/`, `tasks/` 등 |
| 미래 계획 | Agents를 Skills처럼 별도 에디터로 분리 가능. Claude 연동 자동 편집. |

## Data Flow

```text
FilesPage → FilesContext (scope + selectedPath 상태)
  → FilesPageContent → FilesScopeTabs (Global/Project)
                      → FileTree (좌측 280px, 재귀 트리)
                      → FileViewerPanel (우측, 마크다운/JSON/텍스트 뷰어)
                           ↓
                      files.queries.ts (useFileTreeQuery, useFileContentQuery)
                           ↓
                      files.functions.ts (getFileTreeFn, getFileContentFn)
                           ↓
                      files-scanner.service.ts (scanClaudeDir, readFileContent)
                           ↓
                      파일시스템 (~/.claude/, .claude/)
```

## Service Layer

```typescript
// files-scanner.service.ts

interface FileNode {
  name: string           // 파일/디렉토리명
  path: string           // 절대 경로
  type: "file" | "directory"
  children?: FileNode[]  // 디렉토리인 경우
  size?: number          // 파일인 경우
  extension?: string     // ".md", ".json" 등
}

scanClaudeDir(scope, projectPath?): FileNode     // 트리 구조 반환
readFileContent(filePath): { content: string, size: number, lastModified: string }
```

**제외 패턴 (EXCLUDED_PATTERNS):**
- `plugins/cache/` — 플러그인 캐시
- `*.db`, `*.lock` — 데이터베이스/락 파일
- `installed_plugins.json` — 내부 메타
- `teams/`, `tasks/` — 팀 관련 내부 상태
- `.DS_Store` 등 OS 생성 파일

## UI Layout

```text
┌───────────────────────────────────────────────────┐
│ Files                                    [Docs]   │ ← h-12 헤더 + docs 링크
├───────────────────────────────────────────────────┤
│ [Global] [Project]                                │ ← 스코프 탭
├─── 좌측 (280px) ──────┬─── 우측 (flex-1) ────────┤
│  .claude/              │  파일 뷰어               │
│  ├── CLAUDE.md         │                          │
│  ├── settings.json     │  [preview] [source]      │
│  ├── agents/           │                          │
│  │   └── commit.md     │  # CLAUDE.md             │
│  ├── commands/         │  This file provides...   │
│  ├── skills/           │                          │
│  └── docs/  (사용자)   │  [Open in VSCode]        │
│      └── guide.md      │  [Open in Cursor]        │
└────────────────────────┴──────────────────────────┘
```

**뷰어 동작:**
- `.md` 파일: 마크다운 렌더링(preview) + 원본(source) 토글. 기존 `FileViewer` 컴포넌트 재사용.
- `.json` 파일: 구문 강조된 읽기 전용 표시
- 기타 텍스트 파일: 원본 텍스트 표시
- 모든 파일: "Open in VSCode" / "Open in Cursor" 버튼

## Component Structure

```text
features/files-editor/
├── api/
│   ├── files.functions.ts      # getFileTreeFn, getFileContentFn
│   └── files.queries.ts        # useFileTreeQuery, useFileContentQuery + fileKeys
├── components/
│   ├── FilesPage.tsx            # ErrorBoundary + Provider
│   ├── FilesPageContent.tsx     # 헤더 + 스코프 탭 + 트리 + 뷰어
│   ├── FilesScopeTabs.tsx       # Global/Project 탭
│   ├── FileTree.tsx             # 재귀 디렉토리 트리 (Tree/TreeFolder/TreeFile 활용)
│   └── FileViewerPanel.tsx      # 마크다운 렌더링 + source 토글 + Open in Editor
├── services/
│   └── files-scanner.service.ts # scanClaudeDir, readFileContent, EXCLUDED_PATTERNS
├── context/
│   └── FilesContext.tsx          # scope + selectedPath 상태
└── constants.ts                  # EXCLUDED_PATTERNS, 파일 확장자 아이콘 매핑
```

## Migration

### 삭제 대상
| 파일 | 이유 |
|---|---|
| `src/components/pages/FilesPageContent.tsx` | feature module로 대체 |
| `src/routes/global/files/route.tsx` | 리다이렉트로 대체 |
| `src/routes/project/files/route.tsx` | 리다이렉트로 대체 |

### 보존 (다른 feature에서 사용 중)
| 파일 | 사용처 |
|---|---|
| `src/components/FileViewer.tsx` | skills-editor, 새 files-editor에서 재사용 |
| `src/hooks/use-config.ts`의 `useClaudeMdFile` | Dashboard 등에서 참조 가능 |

### 라우트 변경
- 새 라우트: `/files` → `FilesPage`
- `/global/files`, `/project/files` → `/files`로 리다이렉트

### 사이드바 정리
- "Files" top-level 추가 (`FolderOpen` 아이콘, `/files` 경로)
- `globalNavItems`, `projectNavItems` 배열 및 Global/Project 그룹 자체 제거

### 기존 훅 정리 검토
- `useAgentFiles("agent")` — Files 페이지 전용이면 제거, 다른 곳에서도 쓰면 유지
- `useClaudeMdGlobalMeta()` — Dashboard에서 사용 중이면 유지
- `useClaudeMdFiles()` — 새 서비스로 대체 후 제거 검토

### i18n 키
- 기존: `nav_files` (라벨 재사용)
- 추가: `files_title`, `files_docs`, `files_docs_url`, `files_no_selection`, `files_empty_dir`

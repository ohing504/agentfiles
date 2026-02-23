# Hooks Editor Page Design

> agentfiles 사용자가 GUI로 Claude Code hooks를 관리할 수 있는 에디터 페이지

**날짜:** 2026-02-23
**상태:** 설계 확정
**선행 조건:** Phase 1 (개발환경 Hooks 셋업) 완료

---

## 배경

Phase 1에서 개발환경에 hooks를 직접 셋업하며 dogfooding한 경험을 바탕으로,
agentfiles 제품에 Hooks 에디터 페이지를 추가한다.

### Claude Code Hooks 이벤트 (17개)

| # | 이벤트 | Matcher 대상 | Hook Type |
|---|--------|-------------|-----------|
| 1 | SessionStart | startup/resume/clear/compact | command |
| 2 | UserPromptSubmit | 없음 (항상 실행) | command/prompt/agent |
| 3 | PreToolUse | tool name | command/prompt/agent |
| 4 | PermissionRequest | tool name | command/prompt/agent |
| 5 | PostToolUse | tool name | command/prompt/agent |
| 6 | PostToolUseFailure | tool name | command/prompt/agent |
| 7 | Notification | notification type | command |
| 8 | SubagentStart | agent type | command |
| 9 | SubagentStop | agent type | command/prompt/agent |
| 10 | Stop | 없음 (항상 실행) | command/prompt/agent |
| 11 | TeammateIdle | 없음 (항상 실행) | command |
| 12 | TaskCompleted | 없음 (항상 실행) | command/prompt/agent |
| 13 | ConfigChange | config source | command |
| 14 | WorktreeCreate | 없음 (항상 실행) | command |
| 15 | WorktreeRemove | 없음 (항상 실행) | command |
| 16 | PreCompact | manual/auto | command |
| 17 | SessionEnd | exit reason | command |

### Hook Type (3가지)

| Type | 설명 | 고유 필드 |
|------|------|----------|
| command | 셸 명령어 실행 | command, async |
| prompt | LLM 단일 평가 | prompt, model |
| agent | 서브에이전트 검증 | prompt, model |

---

## 레이아웃

### 전체 구조

사이드바에서 Hooks 메뉴는 Dashboard 아래, Global/Project 그룹 바깥에 공통 1개로 배치.
SidebarInset 내에서 좌측 패널(목록) + 우측 패널(상세) 2단 구조.

```text
┌──────────┬─────────────────────────────────────────────┐
│ Sidebar  │  SidebarInset (브레드크럼 없음)              │
│          │  ┌──────────┬──────────────────────────────┐ │
│ Dashboard│  │ Hooks    │  pre-edit-guard.sh           │ │
│ ★ Hooks  │  │          │                              │ │
│ ─Global─ │  │ [Search] │  Type: command               │ │
│  Files   │  │          │  Matcher: Edit|Write         │ │
│  Plugins │  │ Global[+]│  Command: .claude/hooks/...  │ │
│  MCP     │  │ ────────│  Timeout: 5s                 │ │
│  Settings│  │ ▾ PreTool│                              │ │
│ ─Project─│  │   • hook1│  ── Script Preview ────────  │ │
│  Files   │  │   • hook2│  #!/bin/bash                 │ │
│  Plugins │  │ ▾ PostToo│  # PreToolUse: ...           │ │
│  MCP     │  │   • hook3│  INPUT=$(cat)                │ │
│  Settings│  │   • hook4│  ...                         │ │
│          │  │ ▾ Stop   │                              │ │
│          │  │   • hook5│                              │ │
│          │  │          │              [Edit] [Delete]  │ │
│          │  │ Project[+]│                             │ │
│          │  │ ────────│                              │ │
│          │  │ (없음)   │                              │ │
└──────────┴──┴──────────┴──────────────────────────────┘
```

### 반응형

- `lg` 이상: `grid-cols-[280px_1fr]` (좌측 280px + 우측 1fr)
- `lg` 미만: 1열 스택 (좌측 패널만 표시, hook 클릭 시 상세로 전환)

---

## 좌측 패널

### 구조

```text
┌──────────────────────────┐
│ Hooks                    │  ← 페이지 타이틀
│                          │
│ [🔍 Search...         ]  │  ← 검색 Input (이름, command, matcher)
│                          │
│ Global              [+]  │  ← 섹션 타이틀 + 추가 버튼
│ ─────────────────────── │
│ ▾ PreToolUse (2)         │  ← 이벤트 그룹 (Collapsible, 설정된 것만)
│   • pre-edit-guard       │  ← 개별 hook (클릭 시 우측에 상세)
│   • pre-bash-guard       │
│ ▾ PostToolUse (2)        │
│   • lint:fix+format      │
│   • md_formatter         │
│ ▾ Stop (1)               │
│   • typecheck            │
│                          │
│ Project             [+]  │  ← 섹션 타이틀 + 추가 버튼
│ ─────────────────────── │
│ (설정된 hook 없음)        │  ← empty state
│                          │
└──────────────────────────┘
```

### 설계 결정

| 항목 | 결정 |
|------|------|
| Global/Project 구분 | 섹션 타이틀 (collapse 없음, 항상 펼침) |
| 이벤트 그룹 | Collapsible, 설정된 이벤트만 표시 |
| [+] 버튼 위치 | 각 섹션 타이틀 우측 |
| Hook 이름 표시 | command: 명령어/파일명 추출, prompt/agent: prompt 앞부분 truncate |
| 카운트 | 이벤트 그룹 옆에 hook 개수 |
| 검색 | hook 이름, command, matcher로 필터링 |
| 컴포넌트 | Tree 컴포넌트 재사용 (TreeFolder → 이벤트, TreeFile → hook) |

---

## 우측 패널

### 공통 헤더

```text
┌─────────────────────────────────────┐
│ pre-edit-guard.sh          [Delete] │  ← hook 이름 타이틀 + 삭제 버튼
│                                     │
│ Type:    [command ▾]                │  ← Select (command/prompt/agent)
│ Matcher: [Edit|Write        ]       │  ← Input (이벤트가 matcher 지원 시)
│ Timeout: [5             ] sec       │  ← Input (숫자)
│ Async:   [ ] 백그라운드 실행         │  ← Switch (command type만)
```

### Type별 본문

**command:**

```text
│ Command:                             │
│ ┌─────────────────────────────────┐ │
│ │ .claude/hooks/pre-edit-guard.sh │ │  ← Input
│ └─────────────────────────────────┘ │
│                                     │
│ ── Script Preview ──────────────── │  ← 파일 경로 감지 시 미리보기
│ ┌─────────────────────────────────┐ │
│ │ #!/bin/bash                     │ │  ← 읽기 전용 코드 블록
│ │ # PreToolUse: 보호 대상 파일...  │ │
│ │ INPUT=$(cat)                    │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
```

**prompt / agent:**

```text
│ Prompt:                              │
│ ┌─────────────────────────────────┐ │
│ │ Evaluate if Claude should stop: │ │  ← Textarea (여러 줄)
│ │ $ARGUMENTS. Check if all tasks  │ │
│ │ are complete.                   │ │
│ └─────────────────────────────────┘ │
│ Model:   [haiku ▾]                  │  ← Select (선택적)
```

### 스크립트 미리보기 로직

command 값이 파일 경로처럼 보이면 해당 파일 내용을 읽어서 코드 블록으로 표시:
- `.sh`, `.py`, `.js`, `.ts` 확장자
- `$CLAUDE_PROJECT_DIR` 포함
- 상대 경로 (`.claude/hooks/...`)

인라인 명령어 (`pnpm lint:fix && pnpm format`)는 미리보기 없이 command만 표시.

### 빈 상태 (hook 미선택)

```text
│                                     │
│        ⚡ Hook을 선택하세요          │
│     좌측에서 hook을 클릭하면        │
│     상세 정보가 여기에 표시됩니다     │
│                                     │
```

---

## Add Hook Dialog

좌측 패널의 섹션 타이틀 [+] 버튼 클릭 시 열리는 Dialog.

### 구조

```text
┌─────────────────────────────────────────┐
│ Add Hook                          [✕]  │
├─────────────────────────────────────────┤
│                                         │
│ Event:   [PreToolUse           ▾]       │  ← 17개 이벤트 Select
│ Type:    [command               ▾]      │  ← command/prompt/agent
│ Matcher: [Edit|Write            ]       │  ← Input (이벤트가 지원 시)
│                                         │
│ ── command 선택 시 ──                   │
│ Command: [                      ]       │
│ Timeout: [600              ] sec        │
│ Async:   [ ] 백그라운드 실행             │
│                                         │
│ ── prompt/agent 선택 시 ──              │
│ Prompt:                                 │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Model:   [default (fast)        ▾]     │
│                                         │
│ ── Templates ──                         │
│ [Auto Format (Biome)] [File Guard]      │
│ [Bash Guard] [Quality Gate]             │
│                                         │
│                        [Cancel] [Add]   │
└─────────────────────────────────────────┘
```

### 동작

| 항목 | 동작 |
|------|------|
| Scope | Global [+]에서 열면 `~/.claude/settings.json`, Project [+]에서 열면 `.claude/settings.json` |
| Event 선택 | matcher 지원 여부에 따라 matcher 필드 표시/숨김 |
| Type 변경 | command/prompt/agent에 따라 하단 폼 전환 |
| Type 제한 | 이벤트별 지원하는 type만 선택 가능 (SessionStart는 command만) |
| 템플릿 클릭 | 모든 필드 자동 채움 |
| Timeout 기본값 | command: 600s, prompt: 30s, agent: 60s |

### 템플릿 (v1)

| 이름 | Event | Type | Matcher | Command |
|------|-------|------|---------|---------|
| Auto Format (Biome) | PostToolUse | command | Edit\|Write | `npx biome check --write` |
| Auto Format (Prettier) | PostToolUse | command | Edit\|Write | `npx prettier --write` |
| File Protection Guard | PreToolUse | command | Edit\|Write | `.claude/hooks/pre-edit-guard.sh` |
| Dangerous Command Guard | PreToolUse | command | Bash | `.claude/hooks/pre-bash-guard.sh` |
| Quality Gate (typecheck) | Stop | command | - | `pnpm typecheck` |
| Auto Test | PostToolUse | command | Edit\|Write | `npm test` |

---

## 데이터 모델

Claude Code의 settings.json hooks 구조를 그대로 활용:

```typescript
// Hook handler
interface HookEntry {
  type: "command" | "prompt" | "agent";
  command?: string;   // command type
  prompt?: string;    // prompt/agent type
  model?: string;     // prompt/agent type
  timeout?: number;   // seconds
  async?: boolean;    // command type only
  statusMessage?: string;
  once?: boolean;
}

// Event별 matcher group
interface HookMatcherGroup {
  matcher?: string;   // regex (이벤트별 다름, 없으면 전체 매칭)
  hooks: HookEntry[];
}

// 전체 Hooks 설정
type HookEventName =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PermissionRequest"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Notification"
  | "SubagentStart"
  | "SubagentStop"
  | "Stop"
  | "TeammateIdle"
  | "TaskCompleted"
  | "ConfigChange"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "PreCompact"
  | "SessionEnd";

type HooksSettings = Partial<Record<HookEventName, HookMatcherGroup[]>>;
```

---

## 서비스 레이어

```text
src/routes/hooks.tsx              ← Hooks 페이지
src/server/hooks.ts               ← Server Functions
src/services/hooks-service.ts     ← settings.json hooks 섹션 읽기/쓰기
src/shared/types.ts               ← Hook 타입 추가
```

### HooksService

```typescript
export class HooksService {
  // Global hooks 읽기 (~/.claude/settings.json → hooks)
  static async getGlobalHooks(): Promise<HooksSettings>;

  // Project hooks 읽기 (.claude/settings.json → hooks)
  static async getProjectHooks(projectPath: string): Promise<HooksSettings>;

  // Hooks 저장 (scope에 따라 적절한 파일에 쓰기)
  static async saveHooks(
    scope: "global" | "project",
    hooks: HooksSettings,
  ): Promise<void>;

  // 단일 hook 추가
  static async addHook(
    scope: "global" | "project",
    event: HookEventName,
    matcherGroup: HookMatcherGroup,
  ): Promise<void>;

  // 단일 hook 삭제
  static async removeHook(
    scope: "global" | "project",
    event: HookEventName,
    groupIndex: number,
    hookIndex: number,
  ): Promise<void>;

  // 스크립트 파일 읽기 (미리보기용)
  static async readScriptFile(path: string): Promise<string | null>;
}
```

### Server Functions

```typescript
// server/hooks.ts
export const getHooksFn = createServerFn({ method: "GET" })
  .validator(/* scope */)
  .handler(/* HooksService.getGlobalHooks / getProjectHooks */);

export const addHookFn = createServerFn({ method: "POST" })
  .validator(/* event, matcherGroup, scope */)
  .handler(/* HooksService.addHook */);

export const removeHookFn = createServerFn({ method: "POST" })
  .validator(/* event, groupIndex, hookIndex, scope */)
  .handler(/* HooksService.removeHook */);

export const readScriptFn = createServerFn({ method: "GET" })
  .validator(/* path */)
  .handler(/* HooksService.readScriptFile */);
```

---

## 사이드바 변경

### 현재

```text
Dashboard
─ Global ─
  Settings / Files / Plugins / MCP
─ Project ─
  Settings / Files / Plugins / MCP
```

### 변경 후

```text
Dashboard
Hooks        ← 신규 (Global/Project 공통)
─ Global ─
  Settings / Files / Plugins / MCP
─ Project ─
  Settings / Files / Plugins / MCP
```

- 아이콘: `Zap` (lucide-react) 또는 `Workflow`
- 라우트: `/hooks`

---

## 성공 기준

- [ ] 좌측 패널에서 Global/Project hooks를 섹션별로 구분하여 표시
- [ ] 설정된 이벤트만 트리에 표시
- [ ] hook 클릭 시 우측 패널에 상세 정보 표시
- [ ] command type hook의 스크립트 파일 미리보기
- [ ] prompt/agent type hook의 프롬프트 표시
- [ ] [+] 버튼으로 hook 추가 (Dialog)
- [ ] 3가지 hook type (command/prompt/agent) 모두 지원
- [ ] 템플릿으로 원클릭 hook 추가
- [ ] hook 삭제 기능
- [ ] 검색으로 hook 필터링
- [ ] settings.json 직접 수정 방식
- [ ] 기존 테스트 통과 + 새 테스트 추가

---

## 참고 자료

- [Hooks Reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Hooks Guide — Claude Code Docs](https://code.claude.com/docs/ko/hooks-guide)
- Phase 1 설계: `docs/plans/2026-02-23-hooks-system-design.md`

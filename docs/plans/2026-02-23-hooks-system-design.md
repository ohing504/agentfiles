# Hooks System Design

> AI 기반 vibe coding 퀄리티 향상을 위한 Hooks 시스템 구축

**날짜:** 2026-02-23
**상태:** Phase 1 완료, Phase 2 미착수
**접근법:** Dogfooding First — 개발환경 셋업 → 경험 기반 제품 기능 구현

---

## 배경

### 문제점

1. **코드 품질 불일치** — AI가 생성한 코드의 포맷팅, 린트 에러를 수동으로 잡아야 함
2. **컨텍스트 유실** — 새 세션마다 규칙을 다시 설명해야 하는 경우 발생
3. **반복 워크플로우** — 테스트 → 린트 → 빌드 → 커밋을 매번 수동 지시
4. **보안/실수 방지** — AI가 실수로 중요 파일을 수정하거나 위험한 명령을 실행

### 리서치 요약

- Anthropic 공식 가이드: "CLAUDE.md, hooks, docs에 시간을 투자하면 프로덕션 품질 코드를 빌드할 수 있다"
- Hooks는 즉시 코드 품질 + 보안을 높이는 가장 효과적인 수단
- PostToolUse에 포매터/린터, PreToolUse에 보호 가드가 핵심 패턴

---

## Phase 1: 개발환경 Hooks 셋업

> 우리 프로젝트(.claude/settings.json)에 실전 hooks를 설정하여 개발 퀄리티를 즉시 향상시킨다.

### 실제 구현된 파일 구조

```text
.claude/
  settings.json              ← hooks 설정
  hooks/
    pre-edit-guard.sh        ← 파일 보호 가드 (PreToolUse)
    pre-bash-guard.sh        ← 위험 명령어 차단 (PreToolUse)
    markdown_formatter.py    ← 마크다운 포맷팅 (PostToolUse, 공식 예제 기반)
```

### Hook 1: PreToolUse — 파일 보호 가드 ✅ 구현 완료

**트리거:** `Edit|Write` (파일 수정/생성 시)
**동작:** 보호 대상 경로 수정 시 차단 (exit code 2)
**효과:** 중요 파일 변경 원천 차단

**보호 대상:**
- `dist/`, `.output/` — 빌드 산출물
- `node_modules/` — 의존성
- `.env*` — 시크릿
- `pnpm-lock.yaml` — 직접 수정 금지

**`.claude/hooks/pre-edit-guard.sh`:**
```bash
#!/bin/bash
# PreToolUse: 보호 대상 파일 수정 차단
# exit 0 = 허용, exit 2 = 차단 (stderr가 Claude에게 전달)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 프로젝트 루트 기준 상대 경로로 변환
REL_PATH="${FILE_PATH#$CLAUDE_PROJECT_DIR/}"

# 보호 대상 경로 패턴
PROTECTED_PATTERNS=(
  "^dist/"
  "^\.output/"
  "^node_modules/"
  "^\.env"
  "^pnpm-lock\.yaml$"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$REL_PATH" =~ $pattern ]]; then
    echo "BLOCKED: '$REL_PATH' is a protected path. Do not modify build artifacts, dependencies, secrets, or lock files directly." >&2
    exit 2
  fi
done

exit 0
```

### Hook 2: PreToolUse — Bash 명령어 가드 ✅ 구현 완료

**트리거:** `Bash` (셸 명령 실행 시)
**동작:** 위험한 명령어 패턴 차단

**`.claude/hooks/pre-bash-guard.sh`:**
```bash
#!/bin/bash
# PreToolUse: 위험한 bash 명령어 차단
# exit 0 = 허용, exit 2 = 차단 (stderr가 Claude에게 전달)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# 위험한 패턴 목록
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "git push.*--force"
  "git checkout \."
  "git reset --hard"
  "git clean -f"
  "DROP TABLE"
  "DROP DATABASE"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "BLOCKED: Dangerous command detected matching '$pattern'. Please confirm with the user before running destructive commands." >&2
    exit 2
  fi
done

exit 0
```

### Hook 3: PostToolUse — 자동 포맷팅/린팅 ✅ 구현 완료

**트리거:** `Edit|Write` (파일 수정/생성 시)
**동작:** `pnpm lint:fix && pnpm format` (인라인 명령어)
**효과:** AI가 생성한 코드의 스타일 불일치를 즉시 해결

> 설계 시 별도 스크립트(`post-edit-format.sh`)를 계획했으나, 인라인 명령어로 충분하여 간결하게 구현.

### Hook 4: PostToolUse — 마크다운 포맷터 ✅ 구현 완료

**트리거:** `Edit|Write` (파일 수정/생성 시)
**동작:** `markdown_formatter.py` 실행
**효과:** 마크다운 파일 자동 포맷팅

> [공식 예제](https://code.claude.com/docs/ko/hooks-guide) 기반으로 추가.

### Hook 5: Stop — 타입 체크 ✅ 구현 완료

**트리거:** AI 응답 완료 시
**동작:** `pnpm typecheck` (인라인 명령어)
**효과:** 응답 완료 시 타입 에러 자동 감지

> 설계 시 별도 스크립트(`stop-quality-gate.sh`)로 typecheck + lint를 묶어서 계획했으나, PostToolUse에서 lint가 매번 실행되므로 Stop에서는 typecheck만 실행하는 것으로 분리.

### 실제 settings.json 설정

```json
{
  "enabledPlugins": {
    "andrej-karpathy-skills@karpathy-skills": true,
    "claude-code-setup@claude-plugins-official": true
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-edit-guard.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-bash-guard.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm lint:fix && pnpm format"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/markdown_formatter.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pnpm typecheck"
          }
        ]
      }
    ]
  }
}
```

### 설계 대비 변경점

| 항목 | 설계 | 실제 구현 | 이유 |
|------|------|----------|------|
| 자동 포맷팅 | `post-edit-format.sh` 스크립트 | `pnpm lint:fix && pnpm format` 인라인 | 간결함, 별도 스크립트 불필요 |
| 마크다운 포맷팅 | 미계획 | `markdown_formatter.py` 추가 | 공식 예제 기반 추가 |
| 품질 게이트 | `stop-quality-gate.sh`로 typecheck+lint 통합 | `pnpm typecheck` 인라인 (Stop) | lint는 PostToolUse에서 실행되므로 분리 |
| Hook 입력 파싱 | `$CLAUDE_FILE_PATH` 환경변수 | stdin JSON을 `jq`로 파싱 | Claude Code hooks의 실제 인터페이스에 맞춤 |

---

## Phase 2: 제품 기능 — Hooks 에디터 페이지

> Phase 1 경험을 바탕으로, agentfiles 사용자들이 GUI로 hooks를 관리할 수 있는 페이지를 추가한다.

### 핵심 기능

#### 1. Hooks 목록 뷰
- 현재 설정된 hooks를 이벤트별로 그룹핑 (PreToolUse, PostToolUse, Stop 등)
- 각 hook의 matcher, command, timeout 표시
- 활성/비활성 토글
- Global(`~/.claude/settings.json`) vs Project(`.claude/settings.json`) 스코프 배지 (ScopeBadge 재사용)

#### 2. Hook 추가/편집 Dialog
- 이벤트 타입 선택 (드롭다운: PreToolUse, PostToolUse, Stop, SessionStart, Notification, UserPromptSubmit)
- Matcher 패턴 입력 (도구명 regex, ex: `Edit|Write`)
- Command 입력 (셸 명령어 또는 스크립트 경로)
- Timeout 설정 (기본값: 이벤트별 적정 값)
- 환경변수 참조 가이드 (`$CLAUDE_FILE_PATH`, `$CLAUDE_BASH_COMMAND` 등)

#### 3. Hook 템플릿 갤러리
- 자주 쓰는 hooks를 원클릭으로 추가:
  - "Auto Format (Biome)" — PostToolUse, `biome check --write`
  - "Auto Format (Prettier)" — PostToolUse, `prettier --write`
  - "File Protection Guard" — PreToolUse, 민감 파일 차단
  - "Dangerous Command Guard" — PreToolUse, 위험 명령 차단
  - "Quality Gate" — Stop, typecheck + lint
  - "Auto Test" — PostToolUse, 테스트 파일 변경 시 자동 실행

### 라우트 구조

```text
src/routes/hooks.tsx          ← Hooks 페이지 (목록 + 추가/편집)
src/server/hooks.ts           ← Server Functions (getHooksFn, saveHooksFn)
src/services/hooks-service.ts ← settings.json의 hooks 섹션 읽기/쓰기
```

### 데이터 모델

Claude Code의 settings.json hooks 구조를 그대로 활용:

```typescript
// Hook 개별 항목
interface HookEntry {
  type: "command";
  command: string;
  timeout?: number; // ms, 기본 600000 (10분)
}

// 이벤트별 Hook 설정
interface HookConfig {
  matcher?: string; // 도구명 regex (Stop, SessionStart에는 불필요)
  hooks: HookEntry[];
}

// 전체 Hooks 설정
interface HooksSettings {
  PreToolUse?: HookConfig[];
  PostToolUse?: HookConfig[];
  Stop?: HookConfig[];
  SessionStart?: HookConfig[];
  Notification?: HookConfig[];
  UserPromptSubmit?: HookConfig[];
}

// Hook 템플릿
interface HookTemplate {
  id: string;
  name: string;
  description: string;
  event: keyof HooksSettings;
  config: HookConfig;
  script?: string; // 생성할 스크립트 내용 (optional)
}
```

### 서비스 레이어

```typescript
// hooks-service.ts
export class HooksService {
  // Global hooks 읽기 (~/.claude/settings.json → hooks)
  static async getGlobalHooks(): Promise<HooksSettings>;

  // Project hooks 읽기 (.claude/settings.json → hooks)
  static async getProjectHooks(projectPath: string): Promise<HooksSettings>;

  // Hooks 저장 (scope에 따라 적절한 파일에 쓰기)
  static async saveHooks(scope: 'global' | 'project', hooks: HooksSettings): Promise<void>;

  // 단일 hook 추가
  static async addHook(scope: 'global' | 'project', event: string, config: HookConfig): Promise<void>;

  // 단일 hook 삭제
  static async removeHook(scope: 'global' | 'project', event: string, index: number): Promise<void>;

  // Hook 스크립트 파일 생성 (.claude/hooks/)
  static async createHookScript(name: string, content: string): Promise<string>;

  // 템플릿 목록 반환
  static getTemplates(): HookTemplate[];
}
```

### UI 구성

```text
┌─────────────────────────────────────────────────┐
│ Hooks                                    [+ Add] │
├─────────────────────────────────────────────────┤
│                                                   │
│ ▸ PreToolUse (2)                                 │
│   ┌───────────────────────────────────────────┐  │
│   │ 📁 File Protection Guard     [project] ✓  │  │
│   │ matcher: Edit|Write                        │  │
│   │ .claude/hooks/pre-edit-guard.sh            │  │
│   ├───────────────────────────────────────────┤  │
│   │ 🛡️ Bash Command Guard       [project] ✓  │  │
│   │ matcher: Bash                              │  │
│   │ .claude/hooks/pre-bash-guard.sh            │  │
│   └───────────────────────────────────────────┘  │
│                                                   │
│ ▸ PostToolUse (1)                                │
│   ┌───────────────────────────────────────────┐  │
│   │ ✨ Auto Format (Biome)       [project] ✓  │  │
│   │ matcher: Edit|Write                        │  │
│   │ .claude/hooks/post-edit-format.sh          │  │
│   └───────────────────────────────────────────┘  │
│                                                   │
│ ▸ Stop (1)                                       │
│   ┌───────────────────────────────────────────┐  │
│   │ ✅ Quality Gate              [project] ✓  │  │
│   │ .claude/hooks/stop-quality-gate.sh         │  │
│   └───────────────────────────────────────────┘  │
│                                                   │
│ ─── Templates ───────────────────────────────── │
│ [Auto Format (Biome)] [File Guard] [Bash Guard]  │
│ [Quality Gate] [Auto Test] [Auto Format (Prettier)]│
│                                                   │
└─────────────────────────────────────────────────┘
```

### 사이드바 통합

기존 사이드바에 Hooks 메뉴 항목 추가:
- 위치: MCP 아래 또는 Plugins 옆
- 아이콘: ⚡ 또는 🔗
- 라벨: "Hooks"

---

## 구현 순서 요약

| 단계 | 내용 | 산출물 | 상태 |
|------|------|--------|------|
| **Phase 1-1** | Hook 스크립트 작성 | `.claude/hooks/*.sh`, `*.py` | ✅ 완료 |
| **Phase 1-2** | settings.json에 hooks 설정 추가 | `.claude/settings.json` | ✅ 완료 |
| **Phase 1-3** | Dogfooding 및 피드백 수집 | 경험 노트 | 🔄 진행중 |
| **Phase 2-1** | HooksService 구현 | `src/services/hooks-service.ts` | ⬜ 미착수 |
| **Phase 2-2** | Server Functions 구현 | `src/server/hooks.ts` | ⬜ 미착수 |
| **Phase 2-3** | Hooks 페이지 UI 구현 | `src/routes/hooks.tsx` | ⬜ 미착수 |
| **Phase 2-4** | 템플릿 갤러리 구현 | 템플릿 데이터 + UI | ⬜ 미착수 |
| **Phase 2-5** | 사이드바 통합 + 테스트 | 통합 + 테스트 | ⬜ 미착수 |

---

## 성공 기준

### Phase 1
- [x] Hook 스크립트가 정상 동작 (5개 hook 설정 완료)
- [x] AI가 보호 대상 파일을 수정하려 하면 자동 차단됨 (`pre-edit-guard.sh`)
- [x] 파일 수정 후 자동으로 포맷팅/린트가 적용됨 (`pnpm lint:fix && pnpm format`)
- [x] 마크다운 파일 자동 포맷팅 (`markdown_formatter.py`)
- [x] 위험한 bash 명령어가 차단됨 (`pre-bash-guard.sh`)
- [x] 응답 완료 시 타입 에러 자동 감지됨 (`pnpm typecheck`)
- [ ] Dogfooding 피드백 수집 및 개선점 정리

### Phase 2
- [ ] Hooks 페이지에서 Global/Project hooks를 구분하여 표시
- [ ] GUI로 hook 추가/편집/삭제 가능
- [ ] 템플릿으로 원클릭 hook 설정 가능
- [ ] 기존 테스트 통과 + 새 테스트 추가

---

## 참고 자료

- [Hooks Reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Claude Code Hooks Mastery — GitHub](https://github.com/disler/claude-code-hooks-mastery)
- [Claude Code Best Practices — Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [CLAUDE.md Best Practices — Arize](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)

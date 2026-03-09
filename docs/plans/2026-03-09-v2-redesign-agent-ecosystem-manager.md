# v2 Redesign: Agent Ecosystem Manager

> **이전 설계 대체**: `2026-03-06-v2-multi-agent-redesign-design.md` (멀티 에이전트 통합 플랫폼)
> **날짜**: 2026-03-09

## 배경 및 방향 전환 이유

### 기존 v2 설계의 문제

기존 설계는 "멀티 에이전트 통합 플랫폼"을 목표로 했으나, 실제 조사 결과:

1. **크로스 에이전트로 공유 가능한 엔티티는 Skills뿐** — Hooks, Plugins, Agents는 Claude Code 전용
2. **MCP는 에이전트마다 포맷/경로가 다름** — `.mcp.json`은 Claude + Windsurf만 읽고, Codex는 TOML, VS Code는 `servers` 키 사용
3. **skills.sh CLI가 이미 크로스 에이전트 Skills 관리를 잘 해결** — GUI 래퍼만으로는 차별점 부족
4. **본인이 실제로 Claude Code만 사용** — 멀티 에이전트 설계가 추상적이 될 수밖에 없음

### 실제 페인포인트 (사용자 경험 기반)

1. **Plugin 생태계가 복잡** — CLI로 한눈에 파악 어려움, 플러그인 안에 Skills/MCP/Hooks가 중첩
2. **스코프 관리가 고통** — Generic → Global, Tech-stack 종속 → Project, 팀 공유용 → 둘 다. 이동/복사가 불편
3. **중복과 분산** — 같은 Skill이 플러그인에도, standalone에도. Global에도 Project에도. 현황 파악이 어려움

### 핵심 인사이트

> CLI로 모든 게 가능하지만, GUI는 **한눈에 보기**와 **스코프 관리**에서 확실한 가치를 제공한다.

---

## 제품 정의

> **agentfiles = 에이전트 생태계 CLI들의 통합 GUI**
>
> 현재: `claude plugin *` (Claude Code 생태계)
> 확장: `skills *` (크로스 에이전트 생태계)
> GUI가 더하는 가치: 관계 시각화, 스코프 관리, 쉬운 설치/이동

### 포지셔닝

```text
claude plugin (CLI)     = Claude Code 플러그인 설치/관리
skills (CLI)            = 크로스 에이전트 스킬 설치/관리
agentfiles (GUI)        = 위 CLI들의 통합 대시보드
                          + 관계 시각화 (Plugin → Skills/MCP/Hooks)
                          + 스코프 관리 (User ↔ Project 이동/복사)
                          + 중복/충돌 감지
                          + Marketplace (검색/설치)
```

---

## 에이전트별 엔티티 지원 현황 (조사 결과)

### 엔티티 크로스 에이전트 호환성

| 엔티티 | 크로스 에이전트 | 공유 메커니즘 | 비고 |
|--------|:---:|------|------|
| **Skills** | ✅ | `~/.agents/skills/` canonical + symlink | skills.sh 관리 |
| **MCP** | ⚠️ | 없음 (에이전트별 포맷/경로 다름) | JSON 스키마는 유사 |
| **Hooks** | ❌ | Claude Code 전용 | settings.json |
| **Plugins** | ❌ | Claude Code 전용 | claude plugin CLI |
| **Agents** | ❌ | Claude Code 전용 | .claude/agents/ |

### MCP 설정 파일 현황

| 에이전트 | 글로벌 경로 | 프로젝트 경로 | 포맷 | 루트 키 |
|---------|-----------|------------|:----:|:------:|
| Claude Code | `~/.claude.json` | `.mcp.json` | JSON | `mcpServers` |
| Codex | `~/.codex/config.toml` | `.codex/config.toml` | TOML | `[mcp_servers.*]` |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` | JSON | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `.mcp.json` | JSON | `mcpServers` |
| Gemini CLI | `~/.gemini/settings.json` | `.gemini/settings.json` | JSON | `mcpServers` |
| VS Code/Copilot | `~/Library/.../Code/User/mcp.json` | `.vscode/mcp.json` | JSON | `servers` |

---

## 화면 구조

### 1페이지 대시보드 (기존 유지, 개선)

```text
┌─ Header ──────────────────────────────────────────────┐
│  [Main Agent: Claude Code ▾]  [프로젝트 선택 ▾]  ⚙️   │
└───────────────────────────────────────────────────────┘

┌─ Plugins ──────┬─ MCP Servers ──┬─ Skills ────────────┐
│ USER           │ PROJECT        │ USER                │
│  ◆ Superpowers │  ● shadcn   ⏻  │  ▤ api-scaffold    │
│  ├ skill: ...  │  ● fdr-mcp ⏻  │  ▤ commit          │
│  ├ mcp: ...    │ USER           │ PROJECT             │
│  └ hook: ...   │  ● github  ⏻  │  ▤ tdd-workflow    │
│ PROJECT        │                │                     │
│  ◆ Frontend    │                │                     │
│    [→User][복사]│                │                     │
└────────────────┴────────────────┴─────────────────────┘

┌─ Hooks ────────┬─ Agents ───────┬─ LSP Servers ───────┐
│                │                │                     │
└────────────────┴────────────────┴─────────────────────┘

┌─ Memory ──────────────────────────────────────────────┐
│  MEMORY.md                                    2.0 KB  │
└───────────────────────────────────────────────────────┘

(아이템 선택 시 우측 상세 패널 오픈 — 기존과 동일)
```

### 뷰 구성 원칙

- **Plugins**: 내부 구성(skills/mcp/hooks/agents)을 트리로 표시
- **Skills**: standalone만 (플러그인 소속이 아닌 것)
- **MCP Servers**: standalone만 (플러그인 소속이 아닌 것)
- **Agents**: standalone만
- **중복 시**: 경고 표시 (예: standalone skill이 plugin 내부 skill과 이름 동일)

### 기존 개별 페이지 활용

- `/plugins`, `/skills`, `/hooks` 등 기존 페이지 코드 유지
- 향후 디테일 페이지로 활용 가능 (대시보드에서 "더 보기" → 해당 페이지)

---

## 핵심 기능

### 1. 스코프 관리 (신규)

#### 메뉴 액션

```text
User에 있는 아이템:
  → 프로젝트로 이동
  → 프로젝트로 복사

Project에 있는 아이템:
  → 글로벌로 이동
  → 글로벌로 복사
```

#### 드래그 & 드롭

| 동작 | 결과 |
|------|------|
| 드래그 | 이동 (원본 제거) |
| ⌘/Ctrl + 드래그 | 복사 (원본 유지) |

macOS Finder 컨벤션과 동일.

### 2. 중복/충돌 감지 (신규)

- Standalone skill이 plugin 내부 skill과 이름이 같으면 ⚠️ 경고
- 같은 이름의 엔티티가 User와 Project 양쪽에 존재하면 표시
- MCP 서버 이름 충돌 감지 (기존 `isDuplicate` 필드 활용)

### 3. Marketplace (신규)

- Plugin 검색/설치 GUI
- `claude plugin search` / `claude plugin install` CLI 위임
- 설치 시 스코프 선택 (User / Project)

### 4. CLI 위임 원칙 (강화)

| 작업 | 방법 | 이유 |
|------|------|------|
| **읽기** | 파일 직접 파싱 + CLI list 명령 | 빠른 응답 |
| **Plugin 설치/삭제** | `claude plugin install/remove` | CLI가 유효성 검증 |
| **Plugin enable/disable** | `claude plugin enable/disable` | CLI가 상태 관리 |
| **MCP 추가/삭제** | `claude mcp add/remove` | CLI가 설정 파일 관리 |
| **Skill/Agent 이동/복사** | 파일 직접 조작 | CLI 지원 없음 |
| **(향후) Skills 설치** | `skills add/remove` | skills.sh CLI |

### 5. Main Agent 선택기 (신규, 확장 대비)

- 헤더에 배치
- 현재: Claude Code만 선택 가능
- AgentConfig 레지스트리는 구현해두되, Codex 등은 향후 추가
- 선택에 따라 표시되는 엔티티와 경로가 달라지는 구조

---

## 기술 설계

### AgentConfig 레지스트리

```typescript
interface AgentConfig {
  name: AgentType                        // "claude-code" | "codex" | ...
  displayName: string                    // "Claude Code"
  skillsDir: string                      // 프로젝트 상대 경로
  globalSkillsDir: string | undefined    // 글로벌 절대 경로
  configDir: string                      // 프로젝트 설정 디렉토리
  globalConfigDir: string | undefined    // 글로벌 설정 디렉토리
  entities: EntityType[]                 // 지원하는 엔티티 타입
  detectInstalled: () => Promise<boolean>
}

// 초기 등록
const AGENT_REGISTRY: AgentConfig[] = [
  {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills",
    configDir: ".claude",
    globalConfigDir: "~/.claude",
    entities: ["skill", "agent", "hook", "plugin", "mcp"],
    detectInstalled: () => existsSync("~/.claude"),
  },
  // 향후 codex, cursor 등 추가
]
```

### 스코프 이동/복사 구현

```typescript
// Skill/Agent: 파일 복사/이동
async function moveEntity(entity: AgentFile, from: Scope, to: Scope) {
  const sourcePath = entity.path
  const targetDir = to === "user" ? globalDir : projectDir
  const targetPath = path.join(targetDir, path.basename(sourcePath))

  await fs.cp(sourcePath, targetPath, { recursive: true })
  if (isMove) await fs.rm(sourcePath, { recursive: true })
}

// Plugin: CLI 위임
async function movePlugin(plugin: Plugin, from: Scope, to: Scope) {
  // 1. 대상 스코프에 설치
  await exec(`claude plugin install ${plugin.source} --scope ${to}`)
  // 2. 원본 스코프에서 제거 (이동인 경우)
  if (isMove) await exec(`claude plugin remove ${plugin.id} --scope ${from}`)
}
```

### CLI 연동 확장

```typescript
// 기존 claude-cli.ts 확장
export async function claudePluginList(): Promise<Plugin[]> { ... }
export async function claudePluginInstall(source: string, scope: Scope): Promise<void> { ... }
export async function claudePluginRemove(id: string, scope: Scope): Promise<void> { ... }
export async function claudePluginSearch(query: string): Promise<MarketplaceItem[]> { ... }

// 향후 skills CLI 추가
export async function skillsList(agent?: string): Promise<Skill[]> { ... }
export async function skillsAdd(source: string, agent?: string): Promise<void> { ... }
export async function skillsRemove(name: string, agent?: string): Promise<void> { ... }
```

---

## v1 → v2 변경 요약

### 유지

- 1페이지 대시보드 레이아웃 (`ProjectOverviewGrid`)
- Plugin 내부 트리 뷰
- 아이템 선택 → 우측 상세 패널
- 스코프 배지 (User/Project/Local/Managed)
- TanStack Start + React 19 + shadcn/ui 스택
- Server Functions → 파일시스템/CLI 호출 구조
- React Query 데이터 레이어
- 엔티티 아이콘/액션 중앙 관리
- 보안 (127.0.0.1, 토큰 인증)
- 개별 페이지 코드 (향후 디테일 페이지로 활용)

### 변경

| 항목 | 변경 내용 |
|------|----------|
| **UI** | 순수 shadcn/ui 최대 활용 (커스텀 패딩/radius 제거) |
| **설치/삭제** | CLI 위임 우선 원칙 강화 |
| **편집 기능** | 보기 중심으로 축소 |

### 추가

| 항목 | 내용 |
|------|------|
| **Main Agent 선택기** | 헤더에 배치, Claude Code 기본 (향후 확장) |
| **AgentConfig 레지스트리** | 에이전트 메타 정보 중앙 관리 |
| **스코프 이동/복사** | 드래그 (이동) + ⌘/Ctrl+드래그 (복사) + 메뉴 |
| **중복/충돌 감지** | 경고 표시 |
| **Marketplace** | Plugin 검색/설치 GUI |
| **(향후) skills.sh 연동** | skills CLI 통합 |

### 축소

| 항목 | 내용 |
|------|------|
| **편집 기능** | 풀 에디터 → 보기 중심 |
| **Commands** | Skills로 통합됨 (Claude Code 자체 변경) |

---

## Phase 계획

| Phase | 내용 | 우선순위 |
|-------|------|---------|
| **Phase 1** | UI 리프레시 (순수 shadcn/ui) + 스코프 이동/복사 + 중복 감지 | 다음 작업 |
| **Phase 2** | Marketplace + CLI 위임 강화 (install/remove) | 이후 |
| **Phase 3** | Main Agent 선택기 + AgentConfig 레지스트리 | 이후 |
| **Phase 4** | skills.sh CLI 연동 (크로스 에이전트 확장) | 향후 |
| **Phase 5** | 이해 레이어 (AI 요약, 탐색) | 향후 |

---

## 핵심 원칙

1. **CLI가 해주는 건 CLI에 위임** — 설치/삭제 로직을 직접 구현하지 않음
2. **GUI만의 가치에 집중** — 관계 시각화, 스코프 한눈에 보기, 이동/복사
3. **순수 shadcn/ui** — 커스텀 스타일, 패딩, radius 변경 없음
4. **확장 가능한 구조** — AgentConfig로 향후 에이전트 추가 대비
5. **편집보다 관찰** — 에디터 기능은 최소화, 편집은 에이전트/CLI에 위임

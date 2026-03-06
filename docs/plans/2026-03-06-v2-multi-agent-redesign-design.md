# agentfiles v2 — Multi-Agent Redesign

> AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 멀티 에이전트 플랫폼

---

## 배경

### 계기

ChatGPT Apps Skills를 설치하는 과정에서 멀티 에이전트 워크플로우의 현실을 경험:

1. Codex 앱의 스킬 마켓플레이스에서 chatgpt-apps 스킬 발견/설치
2. 설치된 스킬을 Claude에서도 쓰기 위해 `~/.claude/skills`에 수동 symlink 생성
3. skills.sh CLI가 이미 크로스 에이전트 설치를 지원하고 있었음 (`npx skills add`)
4. 설치된 스킬 내부에 agents, references, scripts 등 많은 파일이 있으나 뜯어보지 않음
5. Codex 앱에서 스킬 설명/예제는 보이지만, 내부 파일 구조 탐색은 불가

### 핵심 인사이트

- **설치/연결은 이미 해결됨** — skills.sh가 크로스 에이전트 설치를 잘 처리
- **이해가 빈틈** — 설치 후 내부가 블랙박스. Codex 앱도 skills.sh도 해결 못함
- **에이전트 생태계가 이미 분산됨** — Claude, Codex 각자 디렉토리 구조, 공통의 `~/.agents/`
- **Claude 전용으로는 부족** — 현실적으로 여러 에이전트를 함께 사용

---

## 제품 정체성 재정의

### Before (기존 v2 계획)

> agentfiles = Claude Code 워크플로우를 이해하고 가꿔나가는 플랫폼

### After (새 방향)

> agentfiles = **멀티 에이전트** 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

### 포지셔닝

```text
skills.sh (CLI)     = 발견 + 설치 + 크로스 에이전트 연결
Codex App (GUI)     = Skills 특화 마켓플레이스 + 스킬 생성
agentfiles (GUI)    = 전체 워크플로우 통합 관리
                      (Skills + Plugins + MCP + Hooks + Agents + Settings + CLAUDE.md)
                      + 멀티 에이전트 + 이해 레이어 + AI 가이드
```

### 차별점

| 도구 | 강점 | 한계 |
|------|------|------|
| skills.sh | 크로스 에이전트 설치, CLI UX | 설치 후 이해 없음, GUI 없음 |
| Codex App | 스킬 마켓플레이스, 스킬 생성 | Skills만 다룸, 내부 파일 탐색 불가 |
| agentfiles | 전체 엔티티 통합 조회, 깊은 이해, AI 가이드 | 설치 자체는 skills.sh에 위임 |

### 이름

"agentfiles"가 멀티 에이전트 정체성에 적합. 리브랜딩(claude-code-studio) 계획은 **폐기**.

---

## 멀티 에이전트 아키텍처

### AgentMeta

```typescript
interface AgentMeta {
  id: string              // "claude" | "codex" | ...
  name: string            // "Claude Code" | "Codex" | ...
  homeDir: string         // "~/.claude" | "~/.codex" | ...
  skillsDir: string       // "~/.claude/skills" | "~/.codex/skills"
  entities: EntityType[]  // 지원하는 엔티티 종류
}

// Claude: skills, agents, commands, hooks, plugins, mcp, settings, CLAUDE.md
// Codex:  skills (+ 추후 확장)
// 공통:   ~/.agents/ (skills.sh 관리)
```

### Main Agent 선택

- VS Code의 언어/린터 선택처럼, 항상 접근 가능한 위치에 배치
- Main Agent 선택에 따라 표시되는 디렉토리와 엔티티가 달라짐
- 설정 저장: `~/.claude/agentfiles/settings.json` → `{ mainAgent: "claude" }`
- 초기 지원: Claude, Codex (추후 확장 가능한 구조)

### 스코프 모델 확장

```text
기존 (v1):
  Global (~/.claude/)  vs  Project (.claude/)

새 모델:
  ┌── Shared (~/.agents/)           ← skills.sh 공통
  ├── Agent-Global (~/.claude/)     ← Main Agent 전용 글로벌
  ├── Agent-Project (.claude/)      ← Main Agent 전용 프로젝트
  └── Link/Copy 출처 표시           ← symlink이면 원본 경로 표시
```

### 데이터 흐름

```text
AgentRegistry (AgentMeta[])
    │
    ├── Shared:       ~/.agents/skills/*
    ├── Agent-Global: ~/.claude/{skills,plugins,commands,...}  (Main Agent 기준)
    └── Agent-Project: .claude/{skills,...}                    (프로젝트 기준)
    │
    ▼
통합 뷰: Main Agent 기준으로 필터링 + Shared 항상 포함
         symlink이면 원본 경로 + 출처 표시
```

---

## UI/UX 방향

### 기본 방침

- **v1 레이아웃 전면 재설계**
- **순수 shadcn/ui** — 커스텀 스타일, 색상 변경 없음. 디자인 개선은 나중에 한번에
- Codex app + Claude Desktop을 참고하되, Phase 2에서 상세 분석 후 확정
- 내부 컴포넌트 규칙(EDITOR-GUIDE.md, DASHBOARD-DESIGN-SYSTEM.md)은 유지

### 확실한 방향

- **Main Agent 선택기** — 항상 접근 가능한 위치에 배치
- **프로젝트 선택기** — 유지
- **엔티티별 탐색** — Skills/Hooks/Plugins/MCP 등 카테고리별 진입
- **통합 검색** — 모든 엔티티를 한 곳에서 검색 가능
- **이해 레이어 통합** — 각 엔티티 상세에 AI 요약/번역 자연스럽게 포함
- **파일 구조 탐색** — 스킬 내부 파일들(agents, scripts, references) 트리 탐색

### Phase 2에서 결정할 것

- 네비게이션 구조 (사이드바? 탭? 스레드?)
- 메인 화면 구성 (대시보드? 파일 탐색기?)
- 상세 패널 형태 (2분할? 모달? 시트?)
- Main Agent 선택 위치

---

## 단계별 로드맵

### Phase 1: 멀티 에이전트 기반 + UI 재설계

| 항목 | 설명 |
|------|------|
| AgentMeta 레지스트리 | Claude, Codex 지원. 에이전트별 디렉토리/엔티티 매핑 |
| Main Agent 선택기 | 설정 저장 + UI 선택 |
| 디렉토리 스캔 확장 | `~/.agents/` + 에이전트별 홈 디렉토리 통합 스캔 |
| 스코프 모델 | Shared / Agent-Global / Agent-Project |
| symlink 감지 | link/copy 구분, 원본 경로 표시 |
| UI 전면 재설계 | 순수 shadcn/ui, 커스텀 스타일 없음 |

### Phase 2: skills.sh 분석 + 전체 프레임워크 설계

| 항목 | 설명 |
|------|------|
| skills.sh 코드 분석 | npm 패키지 구조, 설치 메커니즘, 메타데이터 포맷 |
| 마켓플레이스 데이터 모델 설계 | 모든 엔티티가 마켓플레이스에서 어떻게 통합되는지 |
| UI/UX 상세 설계 | Codex app + Claude Desktop 분석 반영 |
| design doc 작성 | 설계 결과를 문서화 |

### Phase 3: 이해 레이어 (Understanding)

| 항목 | 설명 |
|------|------|
| 선호 언어 설정 | Settings에 preferred language |
| AI 요약 카드 | 각 엔티티를 선호 언어로 요약 (Claude CLI pipe) |
| 파일 구조 탐색 | 스킬 내부 파일들(agents, scripts, references) 탐색 |
| 번역 프리뷰 | 영어 원본의 선호 언어 번역 |

### Phase 4: 마켓플레이스 (Discover)

| 항목 | 설명 |
|------|------|
| skills.sh 연동 | GUI에서 검색 → 설치 (skills.sh CLI 위임) |
| 설치 옵션 | 스코프(global/project) + 방식(copy/link) + 대상 에이전트 |
| 설치 상태 동기화 | 마켓 ↔ 로컬 설치 상태 |

### Phase 5: AI 가이드 (Cultivate)

| 항목 | 설명 |
|------|------|
| AI Guide 채팅 | 멀티 에이전트 설정을 인지하는 AI 어시스턴트 |
| 개선 제안 | 현재 설정 분석 → 추천 |

---

## 기존 계획과의 변경점

| 기존 | 변경 |
|------|------|
| v2.0에 AI 요약 + 번역 + AI Guide 한번에 | Phase 분리 (3→4→5) |
| UI 점진적 확장 | **전면 재설계** (Phase 1) |
| Claude 전용 | **멀티 에이전트** (Phase 1) |
| 자체 마켓플레이스 구현 | **skills.sh 연동** (Phase 4) |
| Release Notes Hub (v2.0) | **후순위로 이동** (필요 시 Phase 5+) |
| 리브랜딩(claude-code-studio) | **폐기** — agentfiles 유지 |

---

## 참고

### skills.sh 설치 흐름 (분석 필요)

```text
npx skills add <owner/repo> --skill <name>
  ├── 대상 에이전트 선택 (공통: ~/.agents, Claude: ~/.claude, Codex: ~/.codex)
  ├── 스코프 선택 (global / project)
  ├── 설치 방식 (copy / link[recommended])
  └── 설치 완료 → symlink 또는 복사본 생성
```

### 디렉토리 구조 (관찰 기반, Phase 2에서 정밀 분석)

```text
~/.agents/                     ← skills.sh 공통
  └── skills/<name>/SKILL.md

~/.claude/                     ← Claude Code
  ├── skills/<name> → ~/.agents/skills/<name>  (symlink)
  ├── plugins/
  ├── commands/
  ├── settings.json
  └── CLAUDE.md

~/.codex/                      ← Codex (구조 분석 필요)
  └── skills/<name>
```

---

*2026-03-06 brainstorming 세션에서 작성*
*이전 문서: 2026-03-04-v2-direction-design.md (방향성 재정의 → 이 문서로 대체)*

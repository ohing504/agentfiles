# agentfiles PRD

> AI 에이전트 설정을 관리하고 공유하는 플랫폼

---

## 배경 및 문제 정의

### 현재 페인포인트

Claude Code를 포함한 AI 에이전트 도구들은 설정 파일 기반으로 동작한다. 그런데 이 설정들을 관리하는 GUI 도구가 존재하지 않는다.

구체적인 불편함:

- `~/.claude/CLAUDE.md` 편집하려면 매번 터미널에서 `vi` 직접 열어야 함
- 프로젝트별 `.claude/` vs 글로벌 `~/.claude/` 스코프 관계가 한눈에 안 보임
- skills, agents, commands를 설치/삭제하려면 CLI 명령어를 일일이 입력해야 함
- `npx skills add owner/repo --skill skill-name` 같은 명령어를 매번 기억해야 함
- VS Code 공식 마켓에서 설치한 MCP extension과 CLI로 직접 설치한 MCP가 중복될 때 파악이 어려움
- 프로젝트마다 같은 plugin을 재설치하거나, 글로벌로 두면 불필요한 프로젝트에도 적용됨
- 다른 사람의 에세이나 설정을 참고해서 내 설정을 개선하고 싶어도 복사-붙여넣기 외에 방법이 없음

### 시장 공백

| 도구 | 해결하는 것 | 해결 못 하는 것 |
|------|------------|----------------|
| skills.sh | skills 발견 및 CLI 설치 | GUI 관리, 다른 설정 타입, 설치 현황 확인 |
| Opcode (구 Claudia) | Claude Code 세션 실행 GUI | 설정 파일 편집/관리 |
| chezmoi, yadm 등 dotfiles 매니저 | dotfiles 머신 간 동기화 | AI 에이전트 전용 설정, GUI |
| Kiro IDE | spec-driven 개발 워크플로우 | 기존 에이전트 설정 관리 |

**결론:** "VS Code Extension 마켓플레이스 UX를 Claude 에이전트 설정에 그대로 가져오는 도구"는 현재 존재하지 않는다.

---

## 제품 개요

### 한 줄 정의

> agentfiles = AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

### 핵심 가치

1. **Visibility** — 내 설정 파일들이 어디에 무엇이 있는지, 그리고 **뭘 하는지**까지 한눈에 보인다
2. **Simplicity** — **발견부터** 설치/삭제/업데이트까지 버튼 클릭 하나로 된다
3. **Community** — 다른 사람의 좋은 워크플로우를 발견하고 가져올 수 있다
4. **Cultivation** — AI와 함께 내 워크플로우를 이해하고 개선해나갈 수 있다

### 참조 모델

- **VS Code Extension Marketplace** — 설치/삭제/업데이트 UX
- **skills.sh** — 커뮤니티 레지스트리, 설치 수 기반 랭킹
- **Hugging Face** — 사용자가 자신의 설정을 공개하고 커뮤니티가 사용
- **dotfiles 생태계** — `.claude`도 결국 dotfiles의 일부라는 철학
- **Homebrew** — 발견 + 설치 + 관리의 통합 경험
- **Raycast Store** — 설치하면 바로 설명과 사용법이 보이는 UX
- **Obsidian Community Plugins** — 커뮤니티 플러그인을 앱 안에서 관리

---

## 대상 사용자

**Primary:** Claude Code를 매일 사용하는 개발자

- 터미널은 쓸 수 있지만 설정 관리에 시간 쓰기 싫은 사람
- 여러 프로젝트를 병렬로 관리하는 솔로 개발자
- 좋은 Claude 설정을 찾아 에세이나 레포를 뒤지는 사람

**Secondary:** AI 에이전트 설정을 팀과 공유하고 싶은 팀

---

## 로드맵

### v1 — 로컬 설정 관리 GUI

**목표:** 매일 쓰는 Claude 설정 관리 불편함 해결

**핵심 기능:**

```text
1. 설정 파일 트리 뷰
   - ~/.claude/ 와 현재 프로젝트 .claude/ 동시 표시
   - 글로벌 vs 프로젝트 스코프 시각적 구분
   - 동일 이름 agent/command 충돌 시 경고 표시

2. 파일 편집
   - CLAUDE.md 클릭 → 즉시 에디터 열림 (vi 불필요)
   - agents/*.md, commands/*.md, skills/ 동일하게

3. MCP 관리
   - settings.json 파싱 → 현재 등록된 MCP 서버 목록 표시
   - 어느 스코프(글로벌/프로젝트)에 등록됐는지 표시
   - 중복 MCP 감지

4. skills/agents/commands 설치 현황
   - 현재 설치된 항목 목록
   - 글로벌/프로젝트별 구분

5. 멀티 프로젝트 지원
   - 여러 프로젝트 등록 및 전환 (ProjectSwitcher)
   - 글로벌 설정과 프로젝트별 설정 동시 관리
   - 프로젝트별 CLAUDE.md 재귀 탐색
   - 프로젝트 추가/제거/전환 UI
```

**범위 밖 (v1에서 제외):**
- 커뮤니티 레지스트리 연동
- 클라우드 동기화
- 채팅 패널 (공식 extension이 이미 해줌)

---

### v2 — Discover · Understand · Cultivate

**비전:** "코딩을 위한 IDE가 있듯이, 나만의 에이전트 코딩을 위한 IDE. AI와 함께 가꾸는."

```text
Discover (발견)  →  Understand (이해)  →  Cultivate (가꾸기)
   마켓플레이스         AI 요약/시각화        AI 가이드 편집
```

#### v2.0 — Foundation (이해 레이어 + UI 재설계)

**목표:** 설치한 것들을 이해하고, UI를 재설계하여 v2 기능의 기반 마련

```text
1. UI 전면 재설계
   - shadcn/ui 기반 심플한 레이아웃
   - 마켓플레이스, AI Guide 자리 마련

2. AI 요약 카드
   - 각 skill/hook/plugin/MCP에 대해 사용자 선호 언어 요약 자동 생성
   - 트리거 조건, 핵심 동작, 커스터마이징 포인트 포함
   - 로컬 캐시 (파일 해시 + 선호 언어 기반)

3. 번역 프리뷰
   - 영어 원본 파일의 선호 언어 번역 탭 제공
   - 원문/번역 전환 가능

4. Release Notes Hub
   - Claude Code npm 릴리즈 + GitHub changelog 추적
   - 설치된 plugin GitHub repo 릴리즈 추적
   - AI 요약으로 핵심 변경사항 한눈에

5. 선호 언어 설정
   - Settings에 preferred language 추가
```

#### v2.1 — Marketplace

**목표:** Skills, MCP 서버, Plugins를 한 곳에서 검색하고 원클릭 설치

```text
1. Skills 마켓플레이스
   - skills.sh API 연동
   - 검색/설치/제거, 인기순/최신순 정렬
   - "이미 설치됨" 배지 표시

2. MCP 서버 디렉토리
   - 커뮤니티 curated 목록 (data/mcp-servers.json)
   - 원클릭 설치 + 스코프 선택

3. Plugin 카탈로그
   - 사용 가능한 plugin 브라우징
   - 마켓 ↔ 로컬 설치 상태 동기화

4. 설치 시 AI 요약 자동 생성
   - 설치 직후 바로 이해할 수 있게
```

#### v2.2 — AI Guide + Recipes

**목표:** AI와 대화하면서 워크플로우를 이해하고 개선

```text
1. AI Guide 채팅
   - 내 설정을 인지하는 AI 어시스턴트 (agentfiles 앱 내장)
   - "내 커밋 워크플로우를 설명해줘" → 분석 + 제안
   - AI가 skill/hook 파일 수정안 생성 + 미리보기

2. Workflow Recipes
   - 검증된 워크플로우 조합 패키지 (skills + hooks + CLAUDE.md 조합)
   - 예: "TDD 워크플로우", "코드 리뷰 워크플로우"
   - 마켓플레이스에서 발견 + 원클릭 설치

3. 개선 제안 (온디맨드)
   - 현재 설정 분석 → 개선점 추천
   - "hooks가 없으시네요. pre-commit hook을 추가할까요?"
```

---

### v3 — 클라우드 동기화 + 퍼블릭 레지스트리

**목표:** 자신의 워크플로우를 공유하고, 커뮤니티가 사용하는 생태계

**핵심 기능:**

```text
1. 클라우드 동기화
   - 여러 머신 간 ~/.claude/ 동기화
   - Git 기반 버전 관리

2. 퍼블릭 레지스트리 (웹앱)
   - 사용자가 자신의 워크플로우 패키지 공개
   - 설치 수, 스타 기반 랭킹
   - 에세이/블로그 링크 연결 (워크플로우의 철학과 맥락 공유)

3. 원클릭 설치
   - agentfiles install oyyoung/claude-setup
   - 또는 웹에서 "Install" 버튼
```

---

### v4 — 멀티 에이전트 지원

**목표:** Claude 외 Cursor, Kiro, Windsurf 등으로 확장

**핵심 기능:**

```text
- Cursor: .cursorrules 관리
- Kiro: .kiro/steering 관리
- Windsurf: .windsurf 관리
- 에이전트별 설정 포맷 변환 (예: CLAUDE.md → .cursorrules 자동 변환)
```

**참조:** skills.sh가 멀티 에이전트 지원할 때 symlink/hard copy 방식으로 각각에 맞게 배포하는 방식 참고

---

## 철학

### dotfiles와의 관계

`~/.claude`는 결국 dotfiles의 일부다. 기존 dotfiles 생태계(chezmoi, yadm 등)는 "머신 간 동기화"에 집중했고 GUI가 없다. agentfiles는 "AI 에이전트 설정"이라는 특수성에 집중하고, GUI를 first-class로 제공한다.

### 설계 우선 철학과의 정합성

이 프로젝트 자체가 "AI 시대의 개발자는 설계에 더 많은 시간을 투자한다"는 철학을 담는다. agentfiles는 개발자가 자신의 AI 환경을 설계하고 다듬는 데 집중할 수 있도록, 관리의 번잡함을 없애주는 도구다.

---

## 개발 전략

### 자체 사용 우선 (dogfooding)

- 오영님 본인의 페인포인트 해결이 v1의 유일한 목표
- 매일 직접 쓰면서 불편한 점 → 바로 개선
- 어느 정도 완성도가 되면 오픈소스 공개

### 점진적 확장

- v1을 쓰면서 v2 기능의 우선순위가 자연스럽게 결정됨
- 커뮤니티 레지스트리는 로컬 관리가 충분히 안정된 후에

### 이름 선점

- `agentfiles` — dotfiles에서 직접 영감. agent + files 조합으로 직관적
- 도메인, GitHub organization, npm 패키지명 확보 필요

---

## 경쟁 전략

Claude Code가 자체적으로 설정 관리 GUI를 추가할 가능성이 있다. 그때 그 솔루션이 충분히 좋다면 이 프로젝트를 archive하면 된다. 공식 솔루션이 나오기 전까지, 또는 공식 솔루션이 부족한 영역에서 가치를 제공하는 것이 이 프로젝트의 전략이다.

공식 도구가 나오더라도 **"워크플로우 이해(AI 요약/번역) + AI 가이드 + 통합 마켓플레이스(skills.sh, MCP, plugins)"**는 공식 도구가 쉽게 커버하지 못할 영역이다. 공식 도구는 자사 생태계에 집중하지만, agentfiles는 외부 소스를 통합하는 **메타 레이어** 역할을 한다.

---

*이 문서는 2026년 2월 Claude와의 대화를 기반으로 작성됨*
*참조 대화: AI IDE 생태계 비교, dotfiles 관리 도구 분석, skills.sh 레퍼런스 분석*

---

## 완료된 기능 (v1 구현)

### 사이드바 Global/Project 그룹 구조

사이드바를 계층적 그룹 구조로 재편했다.

- **공통 메뉴**: Dashboard, Hooks는 그룹 구분 없이 최상단에 배치
- **Global 그룹**: `~/.claude/` 전역 설정을 위한 Settings / Files / Plugins / MCP 메뉴
- **Project 그룹**: 선택된 프로젝트의 `.claude/` 설정을 위한 Settings / Files / Plugins / MCP 메뉴
- **프로젝트 미선택 시**: Project 그룹 전체 숨김 처리로 불필요한 노출 방지
- **URL 하위 호환성**: 기존 플랫 URL(`/files`, `/plugins`, `/mcp`)은 `/global/*`로 자동 리다이렉트

### Settings 페이지

`settings.json` 기반 Claude Code 설정을 GUI로 편집할 수 있는 페이지.

**Global Settings (`~/.claude/settings.json` 편집):**

- 모델 선택 드롭다운 (예: claude-opus-4-5, claude-sonnet-4-5 등)
- boolean 값 토글 스위치 (예: autoUpdates, telemetry 등)
- 환경변수 key-value 쌍 편집 (env 객체)
- 상태바 관련 설정 편집

**Global 읽기 전용 (`~/.claude.json`):**

- Claude CLI 설치 정보 및 버전 표시
- 기능 플래그(feature flags) 현황 확인
- 직접 수정 불가, 참조 목적 표시만

**Project Settings:**

- `.claude/settings.json` 편집 (프로젝트 스코프 설정)
- `.claude/settings.local.json` 권한 관리 (로컬 전용, git 제외 대상)

### Hooks 에디터

Claude Code hooks를 GUI로 생성·수정·삭제할 수 있는 전용 에디터.

**스코프 지원 (3개):**

- Global: `~/.claude/settings.json`
- Project: `.claude/settings.json`
- Local: `.claude/settings.local.json`

**이벤트 지원 (17개):**

| 그룹 | 이벤트 |
|------|--------|
| Session | SessionStart, SessionEnd |
| Tool | PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure |
| Agent | SubagentStart, SubagentStop, TeammateIdle, TaskCompleted |
| Response | UserPromptSubmit, Notification, Stop |
| Standalone | WorktreeCreate, WorktreeRemove, PreCompact, ConfigChange |

**Hook 타입 (3종):**

- `command`: 셸 명령 실행
- `prompt`: LLM 단일 평가
- `agent`: 서브에이전트 검증

**UI 구성:**

- 2-panel 레이아웃: 좌측 트리(이벤트 그룹 → hook 목록) + 우측 상세 패널
- Shiki 구문 하이라이트로 스크립트 미리보기
- Add Hook Dialog: TanStack Form + Zod 검증, 2-panel 다이얼로그 구성
- 6개 빌트인 템플릿 제공 (빠른 시작용)
- Hook 편집/삭제: 드롭다운 메뉴로 접근
- `statusMessage`, `once` 고급 필드 지원

### Status Bar

화면 하단에 고정된 상태바로 현재 컨텍스트 정보를 항상 표시.

- **좌측**: 현재 선택된 프로젝트의 절대 경로 표시
- **우측**: CLI 버전 정보 + 업데이트 체커 위젯

### CLI 업데이트 체커

npm registry를 주기적으로 폴링하여 Claude Code CLI 업데이트를 알려주는 위젯.

- npm registry(`@anthropic-ai/claude-code`)를 5분 간격으로 폴링
- **최신 상태**: 초록색 체크 아이콘 표시
- **업데이트 가능**: amber 경고 아이콘 + `v{current} → v{latest}` 텍스트 표시
- **클릭 동작**: `claude update` 명령어를 클립보드에 복사 + toast 알림으로 안내

### i18n (다국어 지원)

Paraglide 기반 영어/한국어 전환 지원.

- **지원 언어**: 영어(en), 한국어(ko)
- **전환 UI**: 사이드바 하단 LanguageSwitcher 컴포넌트
- **적용 범위**: 이벤트 설명, UI 라벨, 메뉴 텍스트 등 전체 인터페이스
- 런타임 전환 가능, 선택한 언어는 세션 간 유지

### Skills 페이지 리디자인

Skills/Commands를 읽기 전용 뷰로 관리하는 페이지.

**레이아웃:**

- 2-panel: 좌측 트리(Global/Project 스코프별 skills + commands) + 우측 상세 패널
- 트리에서 skill 폴더 확장 시 SKILL.md + supporting files 표시
- chevron 클릭으로 폴더 접기, 라벨 클릭으로 선택 (분리된 동작)

**상세 패널:**

- 메타 정보: 스코프, 마지막 업데이트, 설명
- FileViewer 카드: 프리뷰/소스 토글 + 복사 버튼, 고정 높이 헤더
- Frontmatter badges: flex-wrap 가로 나열, 콤마 구분 값 개별 Badge 분리
- Supporting files: 코드/스크립트 파일은 라인넘버 포함 Shiki 하이라이팅

**편집:**

- 드롭다운 메뉴로 VS Code / Cursor / 폴더 열기 / 삭제
- Add Skill 다이얼로그로 새 스킬 생성

### Shiki 구문 하이라이팅

Shiki 기반 듀얼 테마 구문 하이라이팅. 라이트/다크 모드 자동 전환.

- **듀얼 테마**: `github-light-default` + `github-dark-default`, `.dark` 클래스 기반 CSS 변수 전환
- **마크다운 프리뷰**: react-markdown `components` prop으로 코드 블록에 ShikiCodeBlock 연결
- **코드/스크립트 파일**: 라인넘버 표시 (CSS counter 기반)
- **마크다운 소스 뷰**: 라인넘버 없음
- **Transformer**: `removePreBackground` (Tailwind bg-muted 적용), `addLineNumbers` (CSS counter)
- **적용 범위**: Skills 프리뷰, FileViewer 소스 뷰, Hooks 스크립트 미리보기

### Toast 알림

sonner 기반의 피드백 알림 시스템.

- **성공**: 초록색 toast (저장 완료, 복사 완료 등)
- **실패**: 빨간색 toast (오류 발생, 저장 실패 등)
- **정보**: 기본 toast (상태 안내 등)
- 훅 저장, MCP 추가/삭제, 클립보드 복사 등 주요 액션 후 자동 표시

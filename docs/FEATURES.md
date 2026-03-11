# agentfiles PRD

> AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

배경 및 문제 정의는 README.md 참조.

---

## 철학

**내 개발 플로우를 더 쾌적하고 생산성 높게 만드는 것이 0순위.**

AI 모델과 에이전트 생태계는 매주 바뀐다. 프레임워크는 변화 속도를 따라가지 못하고, 특정 도구에 과의존하면 같이 사라진다. 이 환경에서 agentfiles의 생존 수단은 단순하다:

1. **내가 쓰면 살아있다** — 시장 경쟁이 아니라 내 생산성이 존재 이유
2. **가벼움이 보험이다** — npx 한 줄, 상태 없음. 세상이 바뀌면 같이 바꾸면 됨
3. **특정 에이전트에 과의존하지 않는다** — Claude Code 전용이 아닌, 확장 가능한 구조

> "본인만의 규칙 체계가 중요하다." — agentfiles는 그 규칙 체계를 보고, 이해하고, 다듬는 도구다.

## 핵심 가치

1. **Visibility** — 내 설정 파일들이 어디에 무엇이 있는지, **뭘 하는지**까지 한눈에 보인다
2. **Understanding** — AI가 내 워크플로우를 선호 언어로 설명하고, 개선점을 제안한다
3. **Simplicity** — 발견부터 설치/삭제/업데이트까지 버튼 클릭 하나로 된다
4. **Community** — 다른 사람의 좋은 워크플로우를 발견하고 가져올 수 있다

## 참조 모델

- **Homebrew** — 발견 + 설치 + 관리의 통합 경험
- **Raycast Store** — 설치하면 바로 설명과 사용법이 보이는 UX
- **Obsidian Community Plugins** — 커뮤니티 플러그인을 앱 안에서 관리
- **skills.sh** — 커뮤니티 레지스트리, 설치 수 기반 랭킹

---

## 로드맵

### v0.x — 프로토타입 ✅ (현재)

로컬 설정 관리 GUI + 보드 스타일 대시보드. 구현 완료.

- 대시보드 (Notion 보드 스타일 레이아웃, 스코프별 그룹)
- CLAUDE.md / Skills / Hooks / Plugins / MCP / Settings 관리
- 멀티 프로젝트 지원 (글로벌 vs 프로젝트 스코프)
- i18n (영어/한국어)
- 에이전트 선택기 (Claude Code, Codex 등)

### v1 — 정식 릴리즈 (진행 중)

뷰어/모니터링 중심으로 전환. 엔티티 시스템 기반 대시보드 + AI 요약 + 마켓플레이스.

- **디자인 개선** — Codex App, Claude Desktop, Notion 참고
- **선호 언어 설정** — Settings에 preferred language 추가
- **AI 요약 카드** — skill/hook/plugin/MCP를 선호 언어로 요약 (Claude CLI pipe 모드)
- **마켓플레이스** — skills.sh 연동, 검색/설치/제거

### v2 — AI 강화

OAuth/API 키 인증 기반 AI 기능 확장.

- **AI Guide 채팅** — 내 설정을 인지하는 AI 어시스턴트 (Anthropic SDK 스트리밍)
- **Workflow Recipes** — 검증된 워크플로우 조합 패키지
- **개선 제안** — 현재 설정 분석 → 개선점 추천
- **Release Notes Hub** — Claude Code + Plugin 릴리즈 추적, AI 요약

### v3 — 확장 (Multi-Agent + Cloud)

실제로 여러 에이전트를 사용할 때 필요에 의해 확장.

- Cursor (.cursorrules), Kiro (.kiro/steering), Windsurf (.windsurf) 등으로 확장
- 에이전트별 설정 포맷 변환
- 여러 머신 간 `~/.claude/` 동기화

---

## 전략

**원칙: 내 생산성 > 시장 경쟁.**

Claude Code가 자체 설정 관리 GUI를 추가하면, 그걸 쓰면 된다. agentfiles의 지속 가치는 설정 관리 GUI가 아니라:

- **이해** — AI가 내 워크플로우를 설명하고 개선점을 제안하는 것
- **편의** — 여러 소스의 워크플로우를 한 곳에서 설치/관리하는 것
- **확장** — 특정 에이전트에 묶이지 않고 여러 에이전트를 통합하는 것

변화가 빠른 시대에는 가벼운 도구가 살아남는다. npx 한 줄로 실행, 상태 없음, 언제든 적응 가능.

# agentfiles PRD

> AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

배경 및 문제 정의는 README.md 참조.

---

## 핵심 가치

1. **Visibility** — 내 설정 파일들이 어디에 무엇이 있는지, **뭘 하는지**까지 한눈에 보인다
2. **Simplicity** — 발견부터 설치/삭제/업데이트까지 버튼 클릭 하나로 된다
3. **Community** — 다른 사람의 좋은 워크플로우를 발견하고 가져올 수 있다
4. **Cultivation** — AI와 함께 내 워크플로우를 이해하고 개선해나갈 수 있다

## 참조 모델

- **Homebrew** — 발견 + 설치 + 관리의 통합 경험
- **Raycast Store** — 설치하면 바로 설명과 사용법이 보이는 UX
- **Obsidian Community Plugins** — 커뮤니티 플러그인을 앱 안에서 관리
- **skills.sh** — 커뮤니티 레지스트리, 설치 수 기반 랭킹

---

## 로드맵

### v1 — 로컬 설정 관리 GUI ✅

매일 쓰는 Claude 설정 관리 불편함 해결. 구현 완료.

- 대시보드 (요약 + 충돌 감지)
- CLAUDE.md / Skills / Hooks / Plugins / MCP / Settings 편집·관리
- 멀티 프로젝트 지원 (글로벌 vs 프로젝트 스코프)
- i18n (영어/한국어)

### v2.0 — Foundation (이해 레이어 + UI 재설계)

설치한 것들을 이해하고, v2 기능의 기반 마련.

- **UI 전면 재설계** — shadcn/ui 기반, 마켓플레이스·AI Guide 자리 마련
- **선호 언어 설정** — Settings에 preferred language 추가
- **AI 요약 카드** — skill/hook/plugin/MCP를 선호 언어로 요약 (트리거 조건, 핵심 동작, 커스터마이징 포인트). 파일 해시 + 언어 기반 캐시
- **번역 프리뷰** — 영어 원본 파일의 선호 언어 번역 탭 (원문/번역 전환)
- **Release Notes Hub** — Claude Code npm + 설치된 plugin GitHub 릴리즈 추적, AI 요약

### v2.1 — Marketplace

Skills, MCP 서버, Plugins를 한 곳에서 검색하고 원클릭 설치.

- **Skills 마켓플레이스** — skills.sh API 연동, 검색/설치/제거
- **MCP 서버 디렉토리** — curated 목록, 원클릭 설치 + 스코프 선택
- **Plugin 카탈로그** — 브라우징 + 마켓 ↔ 로컬 설치 상태 동기화
- **설치 시 AI 요약 자동 생성** — 설치 직후 바로 이해 가능

### v2.2 — AI Guide + Recipes

AI와 대화하면서 워크플로우를 이해하고 개선.

- **AI Guide 채팅** — 내 설정을 인지하는 AI 어시스턴트 ("내 커밋 워크플로우를 설명해줘" → 분석 + 제안)
- **Workflow Recipes** — 검증된 워크플로우 조합 패키지 (예: "TDD 워크플로우", "코드 리뷰 워크플로우")
- **개선 제안** — 현재 설정 분석 → 개선점 추천

### v3 — 클라우드 동기화 + 퍼블릭 레지스트리

- 여러 머신 간 `~/.claude/` 동기화
- 사용자가 워크플로우 패키지를 공개하고, 커뮤니티가 사용하는 생태계

### v4 — 멀티 에이전트 지원

- Cursor (.cursorrules), Kiro (.kiro/steering), Windsurf (.windsurf) 등으로 확장
- 에이전트별 설정 포맷 변환

---

## 경쟁 전략

Claude Code가 자체 설정 관리 GUI를 추가할 가능성이 있다. 공식 솔루션이 나오기 전까지, 또는 부족한 영역에서 가치를 제공하는 것이 전략이다.

공식 도구가 나오더라도 **"워크플로우 이해(AI 요약/번역) + AI 가이드 + 통합 마켓플레이스"**는 공식 도구가 쉽게 커버하지 못할 영역이다. 공식 도구는 자사 생태계에 집중하지만, agentfiles는 외부 소스를 통합하는 **메타 레이어** 역할을 한다.

# agentfiles v2 Direction Design

> AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

---

## 배경

v1(로컬 설정 관리 GUI)이 완료된 시점에서, 제품 정체성을 재정의한다.

### 핵심 인사이트

1. **개발자는 본인만의 워크플로우를 설계하고 가꿔나가야 한다** — 올인원 블랙박스 도구가 아닌, 이해하고 커스터마이징하는 과정이 진짜 가치
2. **설치한 것들이 사실상 블랙박스** — 파일은 공개돼 있지만 인지적 마찰(긴 영어 파일, 구조 파악 번거로움)로 인해 뜯어보지 않음
3. **이해 없이는 개선 불가** — 뜯어보지 않으니 개선 방향도 모르고, 시작점을 찾지 못함
4. **"설정 관리"만으로는 대체 가능** — 폴더 + symlink + Claude Code로 60-70% 커버 가능. 통합 경험(발견→설치→이해→가꾸기)이 진짜 차별점

### 참고 블로그

- [Boris Tane - How I Use Claude Code](https://boristane.com/blog/how-i-use-claude-code/) — research.md → plan.md → annotation cycle → execute. 사람이 운전석에, 마크다운 파일이 공유 가변 상태
- [Claude Code 세계 1위 개발자 워크플로우](https://yozm.wishket.com/magazine/detail/3630/) — 토큰 양보다 빠른 피드백 루프, 도메인 전문성이 AI 활용 효율 결정

---

## 제품 정체성 재정의

### 한 줄 정의

> **Before:** agentfiles = AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼
>
> **After:** agentfiles = AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼

### 핵심 가치

| 가치 | v1 | v2 |
|------|----|----|
| **Visibility** | 설정 파일이 어디에 뭐가 있는지 한눈에 | + 설치된 것들이 **뭘 하는지**까지 한눈에 |
| **Simplicity** | 설치/삭제/업데이트가 버튼 클릭 하나로 | + **발견부터 설치까지** 한 곳에서 |
| **Community** | (미구현) | 좋은 워크플로우를 발견하고 가져올 수 있는 마켓플레이스 |
| **Cultivation** | (없음) | **AI와 함께** 내 워크플로우를 이해하고 개선해나가기 |

### 비유

> "코딩을 위한 IDE가 있듯이, 나만의 에이전트 코딩을 위한 IDE. AI와 함께 가꾸는."

### 대상 사용자

**Primary:** Claude Code를 매일 사용하는 개발자

- 터미널은 쓸 수 있지만 설정 관리 + 워크플로우 설계에 시간 쓰기 싫은 사람
- 플러그인 설치 후 그냥 쓰고 있지만, 더 잘 쓰고 싶은 사람
- 좋은 Claude 설정을 찾아 에세이나 레포를 뒤지는 사람

### 참조 모델

기존: VS Code Marketplace, skills.sh, Hugging Face, dotfiles 생태계

추가:
- **Homebrew** — 발견 + 설치 + 관리의 통합
- **Raycast Store** — 설치하면 바로 설명과 사용법이 보임
- **Obsidian Community Plugins** — 커뮤니티 플러그인을 앱 안에서 관리

### 경쟁 전략

기존 전략 유지 (Claude가 자체 GUI 추가하면 archive 가능) + 보강:

> 공식 도구가 나오더라도, "워크플로우 이해 + AI 가이드 + 통합 마켓플레이스"는 공식 도구가 쉽게 커버하지 못할 영역. 공식 도구는 자사 생태계에 집중하지만, agentfiles는 skills.sh, GitHub, 커뮤니티 레시피 등 외부 소스를 통합하는 메타 레이어.

---

## v2 기능 아키텍처: 3개 축

```text
Discover (발견)  →  Understand (이해)  →  Cultivate (가꾸기)
   마켓플레이스         AI 요약/시각화        AI 가이드 편집
```

마켓플레이스가 **사람들을 데려오고**, 이해 레이어가 **머물게 하고**, AI 가이드가 **계속 쓰게 만드는** 구조.

---

### Pillar 1: Discover (발견 — 통합 마켓플레이스)

**목표:** Skills, MCP 서버, Plugins, 워크플로우 레시피를 한 곳에서 검색하고 원클릭 설치

**데이터 소스:**

| 소스 | 제공하는 것 | 연동 방식 |
|------|-----------|----------|
| skills.sh | Skills 카탈로그 | API 연동 |
| 커뮤니티 MCP 디렉토리 | MCP 서버 목록 | 자체 curated JSON (`data/mcp-servers.json`) + GitHub PR로 추가 |
| Plugin 마켓플레이스 | Claude Code plugins | 기존 plugin-service 확장 |
| Workflow Recipes | Skills + Hooks + CLAUDE.md 조합 | 자체 curated 또는 커뮤니티 제출 |

**핵심 기능:**

- 카테고리별 브라우징 (코드 품질, 커밋, 테스트, 보안, 생산성 등)
- 검색 (이름, 설명, 태그)
- 인기순/최신순 정렬
- "이미 설치됨" 배지
- 원클릭 설치 + 스코프 선택 (글로벌 vs 프로젝트)
- 상세 페이지: 설명, 설치 수, 의존성 정보

**Workflow Recipes (새 개념):**

- 개별 컴포넌트가 아닌 워크플로우 조합을 패키지로 공유
- 예: "Boris Tane 스타일 커밋 워크플로우" = 특정 skills + pre-commit hook + CLAUDE.md 가이드라인
- 설치 시 필요한 컴포넌트를 자동으로 함께 설치

---

### Pillar 2: Understand (이해 레이어)

**목표:** 설치된 모든 컴포넌트를 노력 없이 이해할 수 있게

**AI 요약 카드:**

- 각 skill/hook/plugin/MCP에 대해 **사용자 선호 언어** 요약 자동 생성
- 포함 내용: 뭘 하는지, 언제 트리거되는지, 핵심 동작, 커스터마이징 포인트
- 로컬 캐시 (파일 해시 + 선호 언어 기반, 변경 시 자동 무효화)
- "더 자세히" 클릭 → 원본 파일의 핵심 부분 하이라이팅

**번역 프리뷰:**

- 영어 원본 파일의 선호 언어 번역 탭 제공
- 원문/번역 전환 가능
- AI 캐시로 재번역 방지

**Release Notes Hub:**

- Claude Code: npm 릴리즈 + GitHub changelog 추적
- 설치된 plugins: 각 플러그인 GitHub repo의 릴리즈 추적
- AI 요약으로 "이번 업데이트의 핵심 변경사항" 한눈에
- 새 릴리즈 시 알림 배지

**컴포넌트 관계 맵:**

- Plugin → 소속 skills/hooks 관계
- Hook 이벤트 → 트리거되는 스크립트/명령 관계
- 글로벌 vs 프로젝트 오버라이드 관계
- 트리 뷰 또는 간단한 다이어그램으로 시각화

---

### Pillar 3: Cultivate (가꾸기 — AI 가이드)

**목표:** AI와 대화하면서 내 워크플로우를 이해하고 개선

**통합 AI 채팅 패널:**

- agentfiles 앱 안에 AI 채팅 창 내장
- 컨텍스트: 현재 설치된 모든 설정 파일을 자동으로 인지
- 사용 예시:
  - "내 현재 커밋 워크플로우를 설명해줘"
  - "pre-commit에서 타입체크도 하게 해줘"
  - "이 skill을 한국어 커밋 메시지용으로 수정해줘"
  - "테스트 자동화 워크플로우를 추천해줘"
- AI가 파일을 직접 수정하거나, 수정안을 미리보기로 제시

**워크플로우 템플릿:**

- 검증된 워크플로우 패턴을 시작점으로 제공
- 예: "TDD 워크플로우", "코드 리뷰 워크플로우", "안전한 배포 워크플로우"
- 마켓플레이스의 Workflow Recipes와 연결

**개선 제안 (온디맨드):**

- 현재 설정을 분석해서 개선점 제안
- "hooks가 없으시네요. 자주 쓰는 pre-commit hook을 추가할까요?"
- "이 skill과 이 skill이 비슷한 일을 합니다. 통합할까요?"

---

## UI/UX 설계

### 설계 원칙

- 기존 v1 레이아웃에 구속되지 않음 — **전면 재설계 가능**
- shadcn/ui 컴포넌트 최대 활용 — 커스텀 컴포넌트 최소화
- 심플한 컴포넌트 위주 — 사용자 UX 용이성 최우선

### 기존 상세 패널 확장

각 skill/hook/plugin/MCP 상세 패널에 탭 추가:

- **Overview** 탭 (NEW): AI 요약 카드 (선호 언어), 트리거 조건, 핵심 동작, 커스터마이징 포인트
- **Source** 탭: 기존 소스 코드 뷰 (변경 없음)
- **Translated** 탭 (NEW): AI 번역된 프리뷰 (원문/번역 전환)

### Marketplace 페이지 (새 페이지)

- 카드 그리드 레이아웃
- 탭으로 카테고리 전환 (Skills / MCP Servers / Plugins / Recipes)
- 검색 + 필터
- 카드 클릭 → 상세 페이지 (설명, 설치 정보, 의존성, AI 요약)

### AI Guide 페이지 (새 페이지)

- 내 전체 설정을 인지하는 AI 채팅 인터페이스
- 분석, 설명, 제안, 수정(미리보기 + 승인)까지 대화형으로 진행

---

## 기술 아키텍처

### AI 통합 (단계적 접근)

**v2.0: Claude CLI pipe 모드**

```bash
echo "이 skill 파일을 한국어로 요약해줘: ..." | claude --pipe
```

- 별도 API 키 불필요 — 기존 Claude 구독 활용
- v1에서 MCP 관리에 CLI 위임하는 패턴과 동일
- 요약/번역 같은 일회성 작업에 적합

**v2.2+: Anthropic SDK**

```typescript
import Anthropic from '@anthropic-ai/sdk';
```

- 스트리밍 지원으로 AI Guide 채팅에 적합
- API 키 관리 필요 (Settings에서 입력)
- AI Guide 채팅 기능 구현 시 전환

### 마켓플레이스 데이터

```text
skills.sh API ──→ ┌──────────────────┐
MCP 디렉토리   ──→ │ MarketplaceService │ ──→ 통합 UI
Plugin 카탈로그 ──→ └──────────────────┘
                       캐시: 15분 TTL
```

- `src/services/marketplace-service.ts` 신규 생성
- 각 소스를 어댑터 패턴으로 통합
- 로컬 캐시 (메모리 또는 파일 시스템)

### AI 요약 캐싱

```typescript
// 캐시 키: 파일 내용 해시 + 선호 언어
const cacheKey = `${fileHash}-${preferredLang}`;
// 저장 위치: ~/.claude/agentfiles/ai-cache/
// 만료: 파일 변경 시 자동 무효화 (해시 불일치)
```

### 확장된 데이터 흐름

```text
v1 흐름 (유지):
  Browser → Server Functions → ConfigService → 파일시스템/CLI

v2 추가 흐름:
  Browser → Server Functions → MarketplaceService → 외부 API
  Browser → Server Functions → AIService → Claude CLI/SDK → 요약/번역/가이드
```

---

## 단계별 로드맵

### v2.0 — Foundation (이해 레이어 + UI 재설계)

| 기능 | 필라 | 설명 |
|------|------|------|
| UI 전면 재설계 | Core | shadcn 기반 심플한 레이아웃 |
| 선호 언어 설정 | Core | Settings에 preferred language 추가 |
| AI 요약 카드 | Understand | skill/hook/plugin/MCP 선호 언어 요약 생성 |
| 번역 프리뷰 | Understand | 영어 파일의 선호 언어 번역 탭 |
| Release Notes Hub | Understand | Claude Code + plugin 릴리즈 추적, AI 요약 |

### v2.1 — Marketplace

| 기능 | 필라 | 설명 |
|------|------|------|
| Skills 마켓플레이스 | Discover | skills.sh 연동, 검색/설치/제거 |
| MCP 서버 디렉토리 | Discover | curated 목록, 원클릭 설치 |
| Plugin 카탈로그 | Discover | 사용 가능한 plugin 브라우징 |
| "이미 설치됨" 연동 | Discover | 마켓 ↔ 로컬 상태 동기화 |
| 설치 시 AI 요약 자동 생성 | Understand | 설치 직후 바로 이해 가능 |

### v2.2 — AI Guide + Recipes

| 기능 | 필라 | 설명 |
|------|------|------|
| AI Guide 채팅 | Cultivate | 내 설정을 인지하는 AI 어시스턴트 |
| Workflow Recipes | Discover + Cultivate | 검증된 워크플로우 조합 패키지 |
| 개선 제안 | Cultivate | 현재 설정 분석 → 개선점 추천 |
| AI 지원 편집 | Cultivate | AI가 skill/hook 파일 수정안 생성 |

### 전체 흐름

```text
v1 (완료)
  └── 로컬 설정 관리 GUI

v2.0 (다음)
  └── 이해 레이어 + UI 재설계 + Release Notes Hub

v2.1
  └── 통합 마켓플레이스 (Skills + MCP + Plugins)

v2.2
  └── AI Guide 채팅 + Workflow Recipes
```

---

*이 문서는 2026-03-04 brainstorming 세션에서 작성됨*
*참조: Boris Tane 블로그, 박진형 인터뷰, v1 PRD/ARCHITECTURE 문서*

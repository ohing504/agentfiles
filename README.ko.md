# agentfiles

**[English](README.md)**

AI 개발 워크플로우를 발견하고, 이해하고, 가꿔나가는 플랫폼입니다.

`npx agentfiles` 실행하면 localhost에서 웹 기반 GUI가 열리고, Claude Code의 `~/.claude/`와 프로젝트별 `.claude/` 워크플로우를 관리할 수 있습니다.

## 왜 만들었나

Claude Code를 비롯한 AI 에이전트 도구들은 설정 파일 기반으로 동작합니다. CLAUDE.md, Skills, Hooks, MCP 서버, Plugins — 이것들을 조합해서 자신만의 개발 워크플로우를 만들어야 합니다.

문제는 세 가지입니다:

1. **관리가 번거롭다** — 설정 파일이 여러 경로에 분산되어 있고, 글로벌/프로젝트 스코프 관계가 한눈에 안 보이며, CLI 명령어를 일일이 기억해야 합니다.
2. **이해가 어렵다** — 마켓플레이스에서 Plugin이나 Skill을 설치해도, 내부가 어떻게 동작하는지 파악하기 어렵습니다. 영어로 된 긴 마크다운 파일을 뜯어볼 동기가 생기지 않습니다.
3. **발견할 곳이 없다** — Skills, MCP 서버, Plugins가 각각 다른 곳에 흩어져 있어 통합 검색과 원클릭 설치가 불가능합니다.

agentfiles는 이 세 가지를 한 곳에서 해결합니다:

- **Visibility** — 설정 파일들이 어디에 무엇이 있는지 한눈에 보인다
- **Management** — Skills, MCP, Plugins, Hooks를 GUI에서 관리한다
- **Understanding** — AI가 내 워크플로우를 선호 언어로 설명한다 (v1 예정)

## 주요 기능

- **대시보드** — 전체 설정 현황 요약 + 충돌 감지
- **CLAUDE.md 에디터** — 글로벌 및 프로젝트 스코프 편집
- **Hooks 에디터** — 17개 이벤트, 3가지 hook type, 빌트인 템플릿
- **Skills 관리** — 마크다운 프리뷰/소스 토글, Frontmatter badges
- **Plugin 관리** — 활성화/비활성화 토글
- **MCP 서버** — 추가/제거/활성화 관리
- **Settings** — Global/Project settings.json 편집
- **다국어** — 영어/한국어 전환 (Paraglide i18n)

## 빠른 시작

### 설치 및 실행

```bash
npx agentfiles
```

명령어를 실행하면 자동으로 localhost에서 Chrome 앱 모드로 웹앱이 실행됩니다.

## 개발 가이드

### 환경 요구사항

- Node.js 20 이상
- pnpm (권장)

### 설치

```bash
pnpm install
```

### 개발 서버

```bash
pnpm dev
```

`localhost:3000` 주소로 개발 서버가 실행됩니다.

### 프로덕션 빌드

```bash
pnpm build
```

### 테스트

```bash
pnpm test
```

### 린트 및 타입 체크

```bash
pnpm lint          # Biome 린트 확인
pnpm lint:fix      # 린트 자동 수정
pnpm typecheck     # TypeScript 타입 체크
```

## 기술 스택

- **프레임워크**: TanStack Start (Vinxi/Nitro 기반 풀스택)
- **프론트엔드**: React 19, TanStack Query, shadcn/ui (Radix Nova), Tailwind CSS v4
- **백엔드**: Server Functions, Node.js
- **언어**: TypeScript (strict mode)
- **마크다운**: gray-matter (frontmatter 파싱), react-markdown (렌더링)
- **구문 하이라이팅**: Shiki (듀얼 테마, transformer 기반)
- **테스트**: Vitest
- **린팅**: Biome
- **패키지 매니저**: pnpm

## 프로젝트 구조

```text
src/
  routes/          # 파일 기반 라우팅 (hooks, global/*, project/*)
  features/        # Feature-based 모듈 (dashboard, hooks-editor, skills-editor 등)
  services/        # 서버 사이드 서비스 (ConfigService, HooksService 등)
  server/          # Server Functions (hooks, settings, plugins, mcp 등)
  components/      # 공유 UI 컴포넌트 (layout/, settings/, ui/ 등)
  hooks/           # React 커스텀 훅
  lib/             # 유틸리티
  shared/          # 공유 타입

messages/          # i18n 메시지 (en/ko)
bin/               # CLI 진입점
tests/             # 테스트
```

## 아키텍처

```text
Browser (React SSR) → Server Functions → 파일시스템
                                       → Claude CLI (MCP/Plugin)
```

- **읽기**: ConfigService가 마크다운/JSON 파일 직접 파싱
- **쓰기**: FileWriter가 마크다운 파일 저장, Claude CLI에 MCP/Plugin 작업 위임
- **API**: `createFileRoute` + `server.handlers` (TanStack Start 방식)
- **데이터 동기화**: React Query polling

## 보안

- 127.0.0.1 바인딩 (로컬호스트만 접근)
- Bearer 토큰 기반 인증
- CORS 미설정 (로컬 앱)
- Path traversal 방지 검증

## 라이선스

MIT

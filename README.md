# agentfiles

AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼입니다.

`npx agentfiles` 실행하면 localhost에서 웹 기반 GUI로 `~/.claude/`와 프로젝트별 `.claude/` 설정을 관리할 수 있습니다.

## 왜 만들었나

Claude Code는 강력하지만, 설정 관리가 온전히 파일시스템에 의존합니다.

- **CLAUDE.md**는 `~/.claude/CLAUDE.md`, 프로젝트 루트 `CLAUDE.md`, `.claude/CLAUDE.md` 등 여러 경로에 분산됩니다. 어디에 뭘 쓸지 매번 고민해야 합니다.
- **Agents, Commands, Skills**는 `.claude/` 하위 디렉토리에 마크다운 파일로 존재하는데, 글로벌(`~/.claude/`)과 프로젝트(`.claude/`) 스코프가 분리되어 있어 전체 현황 파악이 어렵습니다.
- **MCP 서버**와 **Plugin**은 JSON 설정 파일과 `claude` CLI 명령어를 조합해서 관리해야 합니다.
- 설정이 많아질수록 글로벌과 프로젝트 설정 간 **충돌**을 발견하기 어려워집니다.

여기에 생태계 파편화가 문제를 더 키우고 있습니다. MCP는 이제 Claude Code뿐 아니라 Docker, VS Code, Cursor 등 다양한 환경에서 각자의 방식으로 설정을 관리합니다. 같은 MCP 서버를 여러 도구에서 쓰려면 설정을 도구마다 따로 해줘야 합니다.

터미널에 익숙한 개발자라도 이 반복 작업은 번거롭습니다. 그런데 바이브 코딩의 확산으로 터미널에 친숙하지 않은 사용자들도 AI 에이전트를 활용하기 시작했습니다. JSON 설정 파일을 직접 편집하거나 CLI 명령어를 조합하는 건 이들에게 진입 장벽 그 자체입니다.

agentfiles는 이 흩어진 설정들을 한 화면에서 보고, 편집하고, 관리할 수 있는 로컬 GUI를 제공합니다.

## 주요 기능

- **CLAUDE.md 에디터**: 글로벌 및 프로젝트 스코프의 Claude 설정 파일 편집
- **Plugin 관리**: Claude Plugin 활성화/비활성화 토글
- **MCP 서버**: Model Context Protocol 서버 추가/제거
- **Agent/Command/Skill 관리**: 파일 기반 CRUD 작업
- **실시간 대시보드**: 충돌 감지 및 설정 상태 모니터링
- **Hooks 에디터**: Claude Code hooks를 GUI로 추가/편집/삭제. 17개 이벤트, 3가지 hook type (command/prompt/agent), 빌트인 템플릿 지원
- **Settings 관리**: Global/Project settings.json 편집, ~/.claude.json 읽기 전용 뷰
- **Status Bar**: CLI 버전 표시 + npm registry 기반 자동 업데이트 체크
- **다국어 지원**: 영어/한국어 전환 (Paraglide i18n)
- **타입 안전**: TypeScript strict 모드로 안정성 보장

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
- **마크다운**: gray-matter (frontmatter 파싱)
- **테스트**: Vitest
- **린팅**: Biome
- **패키지 매니저**: pnpm

## 프로젝트 구조

```text
src/
  routes/          # 파일 기반 라우팅 (hooks, global/*, project/*)
  services/        # 서버 사이드 서비스 (ConfigService, HooksService 등)
  server/          # Server Functions (hooks, settings, plugins, mcp 등)
  components/      # UI 컴포넌트 (pages/, settings/, StatusBar 등)
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

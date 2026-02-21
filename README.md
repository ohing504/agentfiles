# agentfiles

AI 에이전트 설정 파일의 패키지 매니저 + 커뮤니티 플랫폼입니다.

`npx agentfiles` 실행하면 localhost에서 웹 기반 GUI로 `~/.claude/`와 프로젝트별 `.claude/` 설정을 관리할 수 있습니다.

## 주요 기능

- **CLAUDE.md 에디터**: 글로벌 및 프로젝트 스코프의 Claude 설정 파일 편집
- **Plugin 관리**: Claude Plugin 활성화/비활성화 토글
- **MCP 서버**: Model Context Protocol 서버 추가/제거
- **Agent/Command/Skill 관리**: 파일 기반 CRUD 작업
- **실시간 대시보드**: 충돌 감지 및 설정 상태 모니터링
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

```
src/
  routes/          # TanStack Start 파일 기반 라우팅
  services/        # 서버 사이드 서비스 (ConfigService, FileWriter 등)
  server/          # Server Functions (createServerFn)
  components/      # UI 컴포넌트
  lib/             # 유틸리티
  shared/          # 공유 타입

bin/               # CLI 진입점
tests/             # 테스트
```

## 아키텍처

```
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
